/**
 * Coffee with IT — Booking System  ·  v1.5
 * Sulaiman Al Rajhi University · ICTD · IT Operations Center (ITOC)
 *
 * Container-bound Apps Script for the Google Sheet "Coffee with IT — Bookings".
 * Sheets: Settings · Slots · Bookings · SignIns · Topics
 * Deploy as Web app → Execute as: Me · Who has access: Anyone within sr.edu.sa
 */

const APP_VERSION = '1.5';
const DOMAIN = 'sr.edu.sa';
const SHEETS = { SETTINGS: 'Settings', SLOTS: 'Slots', BOOKINGS: 'Bookings', SIGNINS: 'SignIns', TOPICS: 'Topics' };

const BOOKING_HEADERS = ['BookingId', 'Timestamp', 'Email', 'Name', 'Department', 'Extension',
  'Date', 'Time', 'Mode', 'Notes', 'Status', 'CalendarEventId', 'CancelledAt', 'ReminderSent', 'Attendance', 'Topic'];
const COL = BOOKING_HEADERS.reduce((o, h, i) => (o[h] = i, o), {});

const MODE_LABEL = { onsite: 'حضوري', zoom: 'عن بُعد (Zoom)' };
const DEFAULT_ADMINS = ['m.elmahdy@sr.edu.sa'];   // extra admins: Settings › AdminEmails (comma-separated)
const ATTENDANCE = { Attended: 'حضر', 'No-show': 'لم يحضر' };

/* ───────────────────────────── Web app ───────────────────────────── */

function doGet(e) {
  const email = activeEmail_();
  const wantsAdmin = e && e.parameter && e.parameter.page === 'admin';
  if (!isAllowed_(email) || (wantsAdmin && !isAdmin_(email))) {
    return HtmlService.createHtmlOutput(deniedPage_(email, wantsAdmin))
      .setTitle('Coffee with IT')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  logSignIn_(email);
  if (wantsAdmin) {
    return HtmlService.createHtmlOutputFromFile('Admin')
      .setTitle('لوحة إدارة حجوزات Coffee with IT')
      .setFaviconUrl(ASSET_URL + 'cwit-icon.png')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('احجز جلسة Coffee with IT')
    .setFaviconUrl(ASSET_URL + 'cwit-icon.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Called by the page on load. */
function getInitData() {
  const email = requireUser_();
  const s = getSettings_();
  return {
    email: email,
    version: APP_VERSION,
    topic: String(s.Topic || ''),
    sessionMinutes: Number(s.SessionMinutes) || 10,
    onsiteLocation: String(s.OnsiteLocation || ''),
    days: availability_(),
    myBookings: myBookings_(email),
    topics: topicRows_().filter(t => t.active).map(t => t.name),
    isAdmin: isAdmin_(email),
    adminUrl: isAdmin_(email) ? ScriptApp.getService().getUrl() + '?page=admin' : ''
  };
}

/** Creates a booking. payload = {date, time, mode, name, email, department, extension, notes}
 *  The booking is always recorded under the verified sign-in email (payload.email is display only). */
function book(payload) {
  const email = requireUser_();
  const s = getSettings_();
  const tz = Session.getScriptTimeZone();
  const p = payload || {};

  const name = clean_(p.name, 80);
  const dept = clean_(p.department, 120);
  const ext = clean_(p.extension, 20);
  const notes = clean_(p.notes, 300);
  const topic = clean_(p.topic, 150);
  const activeTopics = topicRows_().filter(t => t.active).map(t => t.name);
  if (activeTopics.length && activeTopics.indexOf(topic) === -1) throw new Error('يرجى اختيار موضوع الجلسة من القائمة.');
  const mode = p.mode === 'zoom' ? 'zoom' : (p.mode === 'onsite' ? 'onsite' : '');
  if (!name || !dept || !mode || !/^\d{4}-\d{2}-\d{2}$/.test(p.date || '') || !/^\d{2}:\d{2}$/.test(p.time || '')) {
    throw new Error('بيانات الحجز غير مكتملة.');
  }

  const sessionMin = Number(s.SessionMinutes) || 10;
  const where = mode === 'zoom' ? String(s.ZoomLink || '') : String(s.OnsiteLocation || '');
  let result;

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const slot = slotRows_().find(r => r.date === p.date && r.time === p.time && r.active);
    if (!slot) throw new Error('هذا الموعد غير متاح.');
    const start = toDateTime_(p.date, p.time);
    if (start <= new Date()) throw new Error('انتهى هذا الموعد، يرجى اختيار موعد آخر.');

    const all = bookingRows_();
    const used = all.filter(b => b.status === 'Confirmed' && b.date === p.date && b.time === p.time).length;
    if (used >= slot.capacity) throw new Error('عذرًا، تم حجز هذا الموعد للتو. يرجى اختيار موعد آخر.');

    const maxActive = Number(s.MaxActiveBookingsPerUser) || 1;
    const active = all.filter(b => b.email === email && b.status === 'Confirmed' && toDateTime_(b.date, b.time) > new Date()).length;
    if (active >= maxActive) throw new Error('لديك حجز قائم بالفعل. يمكنك إلغاؤه من «حجوزاتي» ثم الحجز من جديد.');

    const id = 'CWI-' + Utilities.formatDate(new Date(), tz, 'yyMMdd') + '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase();
    const end = new Date(start.getTime() + sessionMin * 60000);

    let eventId = '';
    if (String(s.CreateCalendarEvents).toUpperCase() === 'TRUE') {
      try {
        const ev = calendar_(s).createEvent('Coffee with IT — ' + name, start, end, {
          guests: email,
          sendInvites: true,
          location: where,
          description: 'جلسة Coffee with IT (' + sessionMin + ' دقائق)\n' +
            'الموضوع: ' + (topic || s.Topic || '') + '\n' +
            'طريقة الحضور: ' + MODE_LABEL[mode] + '\n' +
            'رقم الحجز: ' + id + (notes ? '\nملاحظات: ' + notes : '')
        });
        eventId = ev.getId();
      } catch (err) {
        console.warn('Calendar event not created: ' + err);
      }
    }

    const row = [id, Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss'), email, name, dept, ext,
      p.date, p.time, MODE_LABEL[mode], notes, 'Confirmed', eventId, '', '', '', topic];
    ensureBookingHeaders_();
    const sh = sheet_(SHEETS.BOOKINGS);
    sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setNumberFormat('@').setValues([row]);
    SpreadsheetApp.flush();

    result = { id: id, date: p.date, time: p.time, endTime: Utilities.formatDate(end, tz, 'HH:mm'),
      mode: mode, modeLabel: MODE_LABEL[mode], where: where, name: name, topic: topic || String(s.Topic || '') };
  } finally {
    lock.releaseLock();
  }

  try { sendConfirmation_(email, result, s); } catch (err) { console.warn('Mail failed: ' + err); }
  return result;
}

/** Cancels one of the current user's bookings. */
function cancelBooking(id) {
  const email = requireUser_();
  const s = getSettings_();
  const tz = Session.getScriptTimeZone();
  const sh = sheet_(SHEETS.BOOKINGS);
  const data = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (r[COL.BookingId] === id && r[COL.Email].toLowerCase() === email && r[COL.Status] === 'Confirmed') {
      sh.getRange(i + 1, COL.Status + 1).setValue('Cancelled');
      sh.getRange(i + 1, COL.CancelledAt + 1).setNumberFormat('@')
        .setValue(Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss'));
      if (r[COL.CalendarEventId]) {
        try { const ev = calendar_(s).getEventById(r[COL.CalendarEventId]); if (ev) ev.deleteEvent(); }
        catch (err) { console.warn(err); }
      }
      try { sendCancellation_(email, r, s); } catch (err) { console.warn(err); }
      return { ok: true, days: availability_(), myBookings: myBookings_(email) };
    }
  }
  throw new Error('لم يتم العثور على الحجز.');
}

/* ─────────────────────────── Admin page API ─────────────────────────── */

/** Everything the admin dashboard needs, in one call. */
function getAdminData() {
  const email = requireAdmin_();
  ensureBookingHeaders_();
  const s = getSettings_();
  const rows = sheet_(SHEETS.BOOKINGS).getDataRange().getDisplayValues().slice(1).filter(r => r[COL.BookingId]);
  const bookings = rows.map(r => ({
    id: r[COL.BookingId], timestamp: r[COL.Timestamp], email: r[COL.Email], name: r[COL.Name],
    department: r[COL.Department], extension: r[COL.Extension], date: r[COL.Date], time: r[COL.Time],
    mode: r[COL.Mode] === MODE_LABEL.zoom ? 'zoom' : 'onsite', modeLabel: r[COL.Mode], notes: r[COL.Notes],
    status: r[COL.Status], cancelledAt: r[COL.CancelledAt], attendance: r[COL.Attendance] || '',
    topic: r[COL.Topic] || ''
  }));
  const now = new Date();
  const slots = slotRows_().filter(x => x.active);
  const futureSlots = slots.filter(x => toDateTime_(x.date, x.time) > now);
  const takenFuture = {};
  bookings.forEach(b => { if (b.status === 'Confirmed') takenFuture[b.date + ' ' + b.time] = (takenFuture[b.date + ' ' + b.time] || 0) + 1; });
  const freeFuture = futureSlots.reduce((n, x) => n + Math.max(0, x.capacity - (takenFuture[x.date + ' ' + x.time] || 0)), 0);
  const signIns = Math.max(0, sheet_(SHEETS.SIGNINS).getLastRow() - 1);
  return {
    admin: email, version: APP_VERSION, generatedAt: Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'),
    topic: String(s.Topic || ''), bookings: bookings, topics: topicRows_(),
    slots: { total: slots.length, future: futureSlots.length, freeFuture: freeFuture },
    signIns: signIns, sheetUrl: SpreadsheetApp.getActive().getUrl()
  };
}

/** value: 'Attended' | 'No-show' | '' */
function setAttendance(id, value) {
  requireAdmin_();
  if (['Attended', 'No-show', ''].indexOf(value) === -1) throw new Error('قيمة غير صالحة.');
  ensureBookingHeaders_();
  const sh = sheet_(SHEETS.BOOKINGS);
  const ids = sh.getRange(2, COL.BookingId + 1, Math.max(1, sh.getLastRow() - 1), 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) {
      sh.getRange(i + 2, COL.Attendance + 1).setNumberFormat('@').setValue(value);
      return { ok: true, id: id, attendance: value };
    }
  }
  throw new Error('لم يتم العثور على الحجز.');
}

/** Admin cancels any confirmed booking (the attendee is notified by e-mail). */
function adminCancel(id) {
  requireAdmin_();
  const s = getSettings_();
  const tz = Session.getScriptTimeZone();
  const sh = sheet_(SHEETS.BOOKINGS);
  const data = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (r[COL.BookingId] === id && r[COL.Status] === 'Confirmed') {
      sh.getRange(i + 1, COL.Status + 1).setValue('Cancelled');
      sh.getRange(i + 1, COL.CancelledAt + 1).setNumberFormat('@')
        .setValue(Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss'));
      if (r[COL.CalendarEventId]) {
        try { const ev = calendar_(s).getEventById(r[COL.CalendarEventId]); if (ev) ev.deleteEvent(); } catch (err) { console.warn(err); }
      }
      try { sendCancellation_(r[COL.Email], r, s); } catch (err) { console.warn(err); }
      return getAdminData();
    }
  }
  throw new Error('الحجز غير موجود أو ملغى مسبقًا.');
}

/** Adds a session topic (admin). Returns the full topic list. */
function addTopic(name) {
  const email = requireAdmin_();
  const t = clean_(name, 150);
  if (!t) throw new Error('اكتب اسم الموضوع.');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    if (topicRows_().some(x => x.name === t)) throw new Error('هذا الموضوع موجود بالفعل.');
    const sh = topicsSheet_();
    sh.getRange(sh.getLastRow() + 1, 1, 1, 4).setNumberFormat('@').setValues([[t, 'TRUE',
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'), email]]);
  } finally { lock.releaseLock(); }
  return topicRows_();
}

/** Shows / hides a topic in the booking dropdown (admin). Past bookings keep their topic. */
function setTopicActive(name, active) {
  requireAdmin_();
  const sh = topicsSheet_();
  const vals = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < vals.length; i++) {
    if (vals[i][0] === name) { sh.getRange(i + 1, 2).setNumberFormat('@').setValue(active ? 'TRUE' : 'FALSE'); return topicRows_(); }
  }
  throw new Error('الموضوع غير موجود.');
}

function topicsSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEETS.TOPICS);
  if (!sh) {
    const def = String(getSettingsSafe_().Topic || 'حماية بيانات الاجتماعات عند استخدام Read AI');
    sh = ensureSheet_(SHEETS.TOPICS, ['Topic', 'Active', 'CreatedAt', 'CreatedBy'],
      [[def, 'TRUE', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'), 'setup']]);
  }
  return sh;
}

function topicRows_() {
  return topicsSheet_().getDataRange().getDisplayValues().slice(1).filter(r => r[0])
    .map(r => ({ name: r[0], active: String(r[1]).toUpperCase() !== 'FALSE', createdAt: r[2] || '', createdBy: r[3] || '' }));
}

function isAdmin_(email) {
  const extra = String(getSettingsSafe_().AdminEmails || '').split(/[,;\s]+/).filter(Boolean);
  return DEFAULT_ADMINS.concat(extra).map(x => x.toLowerCase()).indexOf(String(email || '').toLowerCase()) !== -1;
}

function requireAdmin_() {
  const email = requireUser_();
  if (!isAdmin_(email)) throw new Error('هذه الصفحة متاحة لمسؤولي النظام فقط.');
  return email;
}

function getSettingsSafe_() { try { return getSettings_(); } catch (err) { return {}; } }

function ensureBookingHeaders_() {
  const sh = sheet_(SHEETS.BOOKINGS);
  if (sh.getMaxColumns() < BOOKING_HEADERS.length) sh.insertColumnsAfter(sh.getMaxColumns(), BOOKING_HEADERS.length - sh.getMaxColumns());
  const head = sh.getRange(1, 1, 1, BOOKING_HEADERS.length).getDisplayValues()[0];
  BOOKING_HEADERS.forEach((h, i) => {
    if (head[i] !== h) sh.getRange(1, i + 1).setValue(h).setFontWeight('bold').setBackground('#501e8c').setFontColor('#ffffff');
  });
}

/* ─────────────────────────── Admin (menu) ─────────────────────────── */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Coffee with IT')
    .addItem('1) إعداد الأوراق (أول مرة)', 'setup')
    .addItem('2) توليد المواعيد من الإعدادات', 'generateSlots')
    .addSeparator()
    .addItem('تفعيل التذكير التلقائي (كل ساعة)', 'installReminderTrigger')
    .addToUi();
}

function setup() {
  const tz = Session.getScriptTimeZone();
  const today = new Date();
  const fmt = d => Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  ensureSheet_(SHEETS.SETTINGS, ['Key', 'Value', 'Notes'], [
    ['Topic', 'حماية بيانات الاجتماعات عند استخدام Read AI', 'موضوع الجلسة (يظهر في الصفحة والبريد)'],
    ['SessionMinutes', '10', 'مدة الجلسة بالدقائق'],
    ['SlotMinutes', '15', 'الفاصل بين بداية كل موعد (10 دقائق جلسة + 5 دقائق استعداد)'],
    ['StartDate', fmt(new Date(today.getTime() + 86400000)), 'أول يوم للمواعيد yyyy-MM-dd'],
    ['EndDate', fmt(new Date(today.getTime() + 14 * 86400000)), 'آخر يوم للمواعيد yyyy-MM-dd'],
    ['DayStart', '10:00', 'بداية المواعيد اليومية HH:mm'],
    ['DayEnd', '12:00', 'نهاية المواعيد اليومية HH:mm'],
    ['Weekdays', '0,1,2,3,4', '0=الأحد … 4=الخميس'],
    ['CapacityPerSlot', '1', 'عدد الحجوزات المسموح بها لكل موعد'],
    ['MaxActiveBookingsPerUser', '1', 'عدد الحجوزات القائمة المسموح بها لكل موظف'],
    ['OnsiteLocation', 'الإدارة التنفيذية للاتصالات وتقنية المعلومات — [المبنى / الغرفة]', 'مكان الجلسة الحضورية'],
    ['ZoomLink', '[ضع رابط اجتماع Zoom هنا]', 'يُرسل في البريد لمن يختار الحضور عن بُعد'],
    ['NotifyEmail', 'm.elmahdy@sr.edu.sa', 'نسخة مخفية (BCC) من كل رسالة حجز/إلغاء/تذكير'],
    ['CreateCalendarEvents', 'TRUE', 'إنشاء موعد في التقويم ودعوة الموظف'],
    ['CalendarId', 'primary', 'معرّف التقويم أو primary'],
    ['AdminEmails', '', 'مسؤولون إضافيون للوحة الإدارة (مفصولون بفواصل) — m.elmahdy@sr.edu.sa مسؤول دائمًا']
  ]);
  ensureSheet_(SHEETS.SLOTS, ['SlotId', 'Date', 'Time', 'Capacity', 'Active'], []);
  ensureSheet_(SHEETS.BOOKINGS, BOOKING_HEADERS, []);
  ensureSheet_(SHEETS.SIGNINS, ['Email', 'Date', 'Time'], []);
  topicsSheet_();
  safeAlert_('تم إعداد الأوراق. راجع ورقة Settings ثم اختر «توليد المواعيد».');
}

function generateSlots() {
  const s = getSettings_();
  const tz = Session.getScriptTimeZone();
  const sh = sheet_(SHEETS.SLOTS);
  const existing = new Set(slotRows_().map(r => r.date + ' ' + r.time));
  const days = String(s.Weekdays).split(',').map(x => parseInt(x, 10)).filter(x => !isNaN(x));
  const startMin = toMin_(s.DayStart), endMin = toMin_(s.DayEnd);
  const step = Number(s.SlotMinutes) || 15, sess = Number(s.SessionMinutes) || 10;
  const cap = String(Number(s.CapacityPerSlot) || 1);
  const end = parseDate_(s.EndDate);
  const rows = [];
  for (let d = parseDate_(s.StartDate); d <= end; d = new Date(d.getTime() + 86400000)) {
    const dow = Number(Utilities.formatDate(d, tz, 'u')) % 7; // 0 = Sunday
    if (days.indexOf(dow) === -1) continue;
    const ds = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    for (let m = startMin; m + sess <= endMin; m += step) {
      const ts = pad_(Math.floor(m / 60)) + ':' + pad_(m % 60);
      if (!existing.has(ds + ' ' + ts)) rows.push([ds + '_' + ts.replace(':', ''), ds, ts, cap, 'TRUE']);
    }
  }
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, 5).setNumberFormat('@').setValues(rows);
  safeAlert_('تمت إضافة ' + rows.length + ' موعدًا.');
  return rows.length;
}

/** Hourly trigger: reminds attendees whose session starts within the next 2 hours. */
function sendReminders() {
  const s = getSettings_();
  const sh = sheet_(SHEETS.BOOKINGS);
  const data = sh.getDataRange().getDisplayValues();
  const now = new Date(), horizon = new Date(now.getTime() + 2 * 3600000);
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (r[COL.Status] !== 'Confirmed' || r[COL.ReminderSent]) continue;
    const start = toDateTime_(r[COL.Date], r[COL.Time]);
    if (start > now && start <= horizon) {
      try {
        sendReminderMail_(r, s);
        sh.getRange(i + 1, COL.ReminderSent + 1).setNumberFormat('@')
          .setValue(Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'));
      } catch (err) { console.warn(err); }
    }
  }
}

function installReminderTrigger() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sendReminders')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendReminders').timeBased().everyHours(1).create();
  safeAlert_('تم تفعيل التذكير التلقائي كل ساعة.');
}

/* ───────────────────────────── Data ───────────────────────────── */

function availability_() {
  const now = new Date();
  const taken = {};
  bookingRows_().forEach(b => {
    if (b.status === 'Confirmed') taken[b.date + ' ' + b.time] = (taken[b.date + ' ' + b.time] || 0) + 1;
  });
  const byDate = {};
  slotRows_().forEach(r => {
    if (!r.active || toDateTime_(r.date, r.time) <= now) return;
    const remaining = Math.max(0, r.capacity - (taken[r.date + ' ' + r.time] || 0));
    (byDate[r.date] = byDate[r.date] || []).push({ time: r.time, remaining: remaining });
  });
  return Object.keys(byDate).sort().map(date => ({
    date: date,
    times: byDate[date].sort((a, b) => (a.time < b.time ? -1 : 1))
  }));
}

function myBookings_(email) {
  const now = new Date();
  return bookingRows_()
    .filter(b => b.email === email && b.status === 'Confirmed' && toDateTime_(b.date, b.time) > now)
    .map(b => ({ id: b.id, date: b.date, time: b.time, modeLabel: b.mode, topic: b.topic }))
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
}

function slotRows_() {
  return sheet_(SHEETS.SLOTS).getDataRange().getDisplayValues().slice(1)
    .filter(r => r[1] && r[2])
    .map(r => ({ id: r[0], date: r[1], time: r[2], capacity: Number(r[3]) || 1,
      active: String(r[4]).toUpperCase() !== 'FALSE' }));
}

function bookingRows_() {
  return sheet_(SHEETS.BOOKINGS).getDataRange().getDisplayValues().slice(1)
    .filter(r => r[COL.BookingId])
    .map(r => ({ id: r[COL.BookingId], email: r[COL.Email].toLowerCase(), date: r[COL.Date],
      time: r[COL.Time], mode: r[COL.Mode], status: r[COL.Status], topic: r[COL.Topic] || '' }));
}

function getSettings_() {
  const s = {};
  sheet_(SHEETS.SETTINGS).getDataRange().getDisplayValues().slice(1)
    .forEach(r => { if (r[0]) s[String(r[0]).trim()] = r[1]; });
  return s;
}

/* ───────────────────────────── Mail ───────────────────────────── */

const SITE_URL = 'https://ictsru.github.io/coffee/';
const ASSET_URL = SITE_URL + 'assets/';          // logos are served from GitHub Pages
const DEFAULT_COPY_EMAIL = 'm.elmahdy@sr.edu.sa'; // used when Settings › NotifyEmail is empty
const MAIL_FROM_NAME = 'Coffee with IT · ITOC';
const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const C = { purple: '#501e8c', dark: '#3a1464', light: '#f0ebf8', blue: '#0a6eaa', blueLight: '#e6f3fa',
  ink: '#241436', muted: '#6b5a80', line: '#e7e1f0', bg: '#f7f5fb', red: '#b42318', redLight: '#fef3f2', green: '#067647' };
const FONT = "Tahoma, 'Segoe UI', Arial, sans-serif";

/** Every booking e-mail goes to the attendee, with a blind copy to NotifyEmail (or DEFAULT_COPY_EMAIL). */
function send_(to, subject, html, s) {
  const msg = { to: to, subject: subject, htmlBody: html, name: MAIL_FROM_NAME, replyTo: 'servicedesk@sr.edu.sa' };
  const copy = String((s && s.NotifyEmail) || DEFAULT_COPY_EMAIL).trim();
  if (copy && copy.toLowerCase() !== String(to).toLowerCase()) msg.bcc = copy;
  MailApp.sendEmail(msg);
}

function sendConfirmation_(email, b, s) {
  send_(email, '✅ تأكيد حجز جلسة Coffee with IT — ' + arDate_(b.date) + ' · ' + b.time, confirmationHtml_(b, s), s);
}

function sendCancellation_(email, r, s) {
  const b = { id: r[COL.BookingId], date: r[COL.Date], time: r[COL.Time], name: r[COL.Name], modeLabel: r[COL.Mode], topic: r[COL.Topic] || '' };
  send_(email, 'إلغاء حجز جلسة Coffee with IT — ' + arDate_(b.date) + ' · ' + b.time, cancellationHtml_(b, s), s);
}

function sendReminderMail_(r, s) {
  const zoom = r[COL.Mode] === MODE_LABEL.zoom;
  const b = { id: r[COL.BookingId], date: r[COL.Date], time: r[COL.Time], name: r[COL.Name], topic: r[COL.Topic] || '',
    mode: zoom ? 'zoom' : 'onsite', modeLabel: r[COL.Mode],
    where: zoom ? String(s.ZoomLink || '') : String(s.OnsiteLocation || ''),
    endTime: addMinutes_(r[COL.Time], Number(s.SessionMinutes) || 10) };
  send_(r[COL.Email], '⏰ تذكير: جلسة Coffee with IT اليوم الساعة ' + b.time, reminderHtml_(b, s), s);
}

/* ---------- templates (pure: no Apps Script services, easy to preview) ---------- */

function confirmationHtml_(b, s) {
  const mins = Number(s.SessionMinutes) || 10;
  const calendarInvite = String(s.CreateCalendarEvents).toUpperCase() === 'TRUE';
  const body =
    p_('مرحبًا <b>' + esc_(b.name) + '</b>،') +
    p_('يسعدنا تأكيد حجزك لجلسة <b>Coffee with IT</b>' + ((b.topic || s.Topic) ? ' حول <b>' + esc_(b.topic || s.Topic) + '</b>' : '') + '.') +
    detailsCard_([
      ['الموضوع', esc_(b.topic || s.Topic || '')],
      ['رقم الحجز', '<span style="font-family:Consolas,Menlo,monospace;background:' + C.light + ';color:' + C.dark + ';padding:2px 8px;border-radius:4px;direction:ltr;unicode-bidi:isolate">' + esc_(b.id) + '</span>'],
      ['التاريخ', esc_(arDate_(b.date))],
      ['الوقت', timeRange_(b) + ' <span style="color:' + C.muted + ';font-weight:normal">· مدة الجلسة ' + mins + ' دقائق</span>'],
      ['طريقة الحضور', modePill_(b.mode, b.modeLabel)]
    ]) +
    whereBlock_(b) +
    (b.mode === 'zoom' ? '' : (calendarInvite
      ? note_('📅 أرسلنا إليك أيضًا دعوة في تقويم Google بموعد الجلسة.')
      : '<div style="margin:18px 0 4px">' + button_('أضف الموعد إلى التقويم', calendarLink_(b, s), C.blue) + '</div>')) +
    '<div style="margin:22px 0 6px;font-weight:bold;color:' + C.dark + '">قبل الجلسة</div>' +
    '<ul style="margin:0;padding:0 18px 0 0;color:' + C.ink + '">' +
      (b.mode === 'zoom'
        ? '<li>تأكد من تثبيت تطبيق Zoom وتجربة الصوت مسبقًا.</li><li>ادخل إلى الاجتماع من الدعوة قبل الموعد بدقيقتين.</li>'
        : '<li>نرجو الحضور قبل الموعد بدقيقتين.</li><li>يمكنك إحضار جهازك المحمول لتطبيق الإعدادات مباشرة.</li>') +
    '</ul>' +
    '<div style="margin:24px 0 0;border-top:1px solid ' + C.line + ';padding-top:18px">' +
      '<span style="color:' + C.muted + ';font-size:14px">تغيّرت ظروفك؟ </span>' +
      '<a href="' + SITE_URL + '" style="color:' + C.purple + ';font-weight:bold;font-size:14px">إدارة الحجز أو إلغاؤه</a>' +
    '</div>';
  return layout_({ preheader: 'حجزك مؤكد: ' + arDate_(b.date) + ' الساعة ' + b.time + ' — ' + b.modeLabel,
    icon: '✓', title: 'تم تأكيد حجزك', subtitle: arDate_(b.date) + ' · ' + b.time, accent: C.purple, body: body });
}

function cancellationHtml_(b, s) {
  const body =
    p_('مرحبًا <b>' + esc_(b.name || '') + '</b>،') +
    p_('تم إلغاء حجزك لجلسة <b>Coffee with IT</b> بناءً على طلبك، وأصبح الموعد متاحًا لزملائك.') +
    detailsCard_([
      ['رقم الحجز', '<span style="font-family:Consolas,Menlo,monospace;direction:ltr;unicode-bidi:isolate">' + esc_(b.id) + '</span>'],
      ['التاريخ', esc_(arDate_(b.date))],
      ['الوقت', '<span dir="ltr">' + esc_(b.time) + '</span>'],
      ['الحالة', '<span style="background:' + C.redLight + ';color:' + C.red + ';padding:2px 10px;border-radius:4px;font-weight:bold">ملغى</span>']
    ]) +
    p_('يسعدنا حجزك لموعد آخر في أي وقت.') +
    '<div style="margin:6px 0 4px">' + button_('احجز موعدًا آخر', SITE_URL, C.purple) + '</div>';
  return layout_({ preheader: 'تم إلغاء حجزك ' + b.id, icon: '✕', title: 'تم إلغاء الحجز',
    subtitle: arDate_(b.date) + ' · ' + b.time, accent: C.dark, body: body });
}

function reminderHtml_(b, s) {
  const body =
    p_('مرحبًا <b>' + esc_(b.name || '') + '</b>،') +
    p_('نذكّرك بجلسة <b>Coffee with IT</b>' + (b.topic ? ' حول <b>' + esc_(b.topic) + '</b>' : '') + ' اليوم الساعة <b dir="ltr">' + esc_(b.time) + '</b>.') +
    detailsCard_([
      ['رقم الحجز', '<span style="font-family:Consolas,Menlo,monospace;direction:ltr;unicode-bidi:isolate">' + esc_(b.id) + '</span>'],
      ['الوقت', timeRange_(b)],
      ['طريقة الحضور', modePill_(b.mode, b.modeLabel)]
    ]) +
    whereBlock_(b);
  return layout_({ preheader: 'جلستك اليوم الساعة ' + b.time, icon: '⏰', title: 'تذكير بموعد جلستك',
    subtitle: 'اليوم · ' + b.time, accent: C.blue, body: body });
}

/* ---------- building blocks ---------- */

function layout_(o) {
  return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc_(o.title) + '</title></head>' +
    '<body style="margin:0;padding:0;background:' + C.bg + '">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0">' + esc_(o.preheader) + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + C.bg + '"><tr>' +
    '<td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ' + C.line + ';border-radius:6px;border-collapse:separate;overflow:hidden">' +
      // logos
      '<tr><td style="padding:16px 24px;border-bottom:1px solid ' + C.line + '">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
          '<td align="right" valign="middle"><img src="' + ASSET_URL + 'sru-logo.png" alt="جامعة سليمان الراجحي" height="34" style="display:block;height:34px;width:auto;border:0"></td>' +
          '<td align="left" valign="middle"><img src="' + ASSET_URL + 'ictd-logo.png" alt="الإدارة التنفيذية للاتصالات وتقنية المعلومات" height="44" style="display:block;height:44px;width:auto;border:0"></td>' +
        '</tr></table></td></tr>' +
      // hero
      '<tr><td style="background:' + o.accent + ';padding:26px 28px 24px;font-family:' + FONT + ';color:#ffffff;text-align:right">' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
          '<td valign="middle" style="padding-left:10px"><img src="' + ASSET_URL + 'cwit-mark-white.png" alt="Coffee with IT" width="40" height="40" style="display:block;width:40px;height:40px;border:0"></td>' +
          '<td valign="middle"><span style="display:inline-block;background:rgba(255,255,255,0.18);border-radius:4px;padding:3px 12px;font-size:13px;font-weight:bold;direction:ltr">Coffee with IT · 10 min</span></td>' +
        '</tr></table>' +
        '<div style="font-size:26px;line-height:1.4;font-weight:bold;margin-top:12px">' +
          '<span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;background:#ffffff;color:' + o.accent + ';border-radius:50%;font-size:18px;margin-left:8px;vertical-align:middle">' + o.icon + '</span>' +
          esc_(o.title) + '</div>' +
        '<div style="font-size:15px;margin-top:4px;opacity:0.92">' + esc_(o.subtitle) + '</div>' +
      '</td></tr>' +
      '<tr><td style="height:5px;line-height:5px;font-size:0;background:' + C.blue + '">&nbsp;</td></tr>' +
      // body
      '<tr><td style="padding:26px 28px 28px;font-family:' + FONT + ';color:' + C.ink + ';font-size:15px;line-height:1.85;text-align:right">' + o.body + '</td></tr>' +
      // footer
      '<tr><td style="background:' + C.light + ';padding:16px 24px;font-family:' + FONT + '">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
          '<td align="right" valign="middle" style="font-size:13px;color:' + C.dark + ';line-height:1.7" dir="ltr">' +
            '<b>For Support:</b> Dial <b style="font-size:18px;color:' + C.purple + '">*</b> or Send email to: ' +
            '<a href="mailto:servicedesk@sr.edu.sa" style="color:' + C.purple + ';font-weight:bold;text-decoration:none">servicedesk@sr.edu.sa</a></td>' +
          '<td align="left" valign="middle" width="110"><a href="https://ictsru.github.io/ITOC/#forms" target="_blank">' +
            '<img src="' + ASSET_URL + 'itoc-logo.png" alt="ITOC — IT Operations Center" height="38" style="display:block;height:38px;width:auto;border:0"></a></td>' +
        '</tr></table></td></tr>' +
    '</table>' +
    '<div style="font-family:' + FONT + ';font-size:12px;color:' + C.muted + ';padding:14px 8px 0;line-height:1.7">' +
      'رسالة آلية من نظام حجز Coffee with IT — مركز عمليات تقنية المعلومات (ITOC)<br>' +
      'الإدارة التنفيذية للاتصالات وتقنية المعلومات — جامعة سليمان الراجحي</div>' +
    '</td></tr></table></body></html>';
}

function p_(html) { return '<p style="margin:0 0 12px">' + html + '</p>'; }

function detailsCard_(rows) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;border:1px solid ' + C.line + ';border-radius:6px;border-collapse:separate">' +
    rows.map(function (r, i) {
      return '<tr><td style="padding:11px 16px;color:' + C.muted + ';font-size:14px;width:120px;white-space:nowrap' + (i ? ';border-top:1px solid ' + C.line : '') + '">' + r[0] + '</td>' +
        '<td style="padding:11px 16px;font-weight:bold;color:' + C.ink + (i ? ';border-top:1px solid ' + C.line : '') + '">' + r[1] + '</td></tr>';
    }).join('') + '</table>';
}

function modePill_(mode, label) {
  const zoom = mode === 'zoom' || label === MODE_LABEL.zoom;
  return '<span style="display:inline-block;background:' + (zoom ? C.blueLight : C.light) + ';color:' + (zoom ? '#08537f' : C.dark) +
    ';padding:2px 12px;border-radius:4px">' + (zoom ? '🎥 ' : '📍 ') + esc_(label || '') + '</span>';
}

function whereBlock_(b) {
  if (b.mode === 'zoom') {
    return '<div style="background:' + C.blueLight + ';border-radius:6px;padding:16px 18px;margin:4px 0 6px;font-weight:bold;color:#08537f">' +
      '🎥 سيتم إرسال دعوة اجتماع Zoom</div>';
  }
  return '<div style="background:' + C.light + ';border-radius:6px;padding:16px 18px;margin:4px 0 6px">' +
    '<div style="font-weight:bold;color:' + C.dark + ';margin-bottom:4px">📍 مكان الجلسة</div>' +
    '<div>' + esc_(b.where || '') + '</div></div>';
}

/** "من 11:45 إلى 11:55" — Arabic connectors keep the order correct in every mail client. */
function timeRange_(b) {
  return 'من <span dir="ltr">' + esc_(b.time) + '</span> إلى <span dir="ltr">' + esc_(b.endTime) + '</span>';
}

function button_(text, href, color) {
  return '<a href="' + esc_(href) + '" target="_blank" style="display:inline-block;background:' + color + ';color:#ffffff;text-decoration:none;' +
    'font-family:' + FONT + ';font-weight:bold;font-size:15px;padding:12px 26px;border-radius:4px">' + esc_(text) + '</a>';
}

function note_(text) {
  return '<div style="margin:16px 0 0;color:' + C.muted + ';font-size:14px">' + esc_(text) + '</div>';
}

function calendarLink_(b, s) {
  const d = String(b.date).replace(/-/g, '');
  const t1 = String(b.time).replace(':', '') + '00', t2 = String(b.endTime).replace(':', '') + '00';
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent('Coffee with IT — ' + b.id) +
    '&dates=' + d + 'T' + t1 + '/' + d + 'T' + t2 + '&ctz=Asia/Riyadh' +
    '&location=' + encodeURIComponent(b.where || '') +
    '&details=' + encodeURIComponent((b.topic || s.Topic || '') + '\nرقم الحجز: ' + b.id);
}

function arDate_(ds) {
  const a = String(ds).split('-').map(Number);
  if (a.length < 3 || !a[0]) return String(ds);
  const d = new Date(a[0], a[1] - 1, a[2], 12);
  return AR_DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + AR_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}

function addMinutes_(t, m) {
  const a = String(t).split(':').map(Number), x = (a[0] || 0) * 60 + (a[1] || 0) + m;
  return pad_(Math.floor(x / 60)) + ':' + pad_(x % 60);
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function activeEmail_() {
  return String(Session.getActiveUser().getEmail() || '').toLowerCase();
}

function isAllowed_(email) {
  return !!email && email.slice(-(DOMAIN.length + 1)) === '@' + DOMAIN;
}

function requireUser_() {
  const email = activeEmail_();
  if (!isAllowed_(email)) throw new Error('الدخول متاح فقط بالبريد الجامعي @' + DOMAIN);
  return email;
}

function logSignIn_(email) {
  try {
    const tz = Session.getScriptTimeZone(), now = new Date();
    const sh = sheet_(SHEETS.SIGNINS);
    sh.getRange(sh.getLastRow() + 1, 1, 1, 3).setNumberFormat('@')
      .setValues([[email, Utilities.formatDate(now, tz, 'yyyy-MM-dd'), Utilities.formatDate(now, tz, 'HH:mm:ss')]]);
  } catch (err) { console.warn(err); }
}

function sheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('الورقة «' + name + '» غير موجودة. شغّل setup أولًا.');
  return sh;
}

function ensureSheet_(name, headers, rows) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#501e8c').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    if (rows.length) sh.getRange(2, 1, rows.length, rows[0].length).setNumberFormat('@').setValues(rows);
    sh.autoResizeColumns(1, headers.length);
  }
  return sh;
}

function calendar_(s) {
  const id = String(s.CalendarId || 'primary');
  return (id === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(id)) ||
    CalendarApp.getDefaultCalendar();
}

function toDateTime_(date, time) {
  const d = String(date).split('-').map(Number), t = String(time).split(':').map(Number);
  return new Date(d[0], d[1] - 1, d[2], t[0] || 0, t[1] || 0, 0);
}

function parseDate_(v) {
  const d = String(v).split('-').map(Number);
  return new Date(d[0], d[1] - 1, d[2], 12, 0, 0);
}

function toMin_(v) {
  const t = String(v).split(':').map(Number);
  return (t[0] || 0) * 60 + (t[1] || 0);
}

function pad_(n) { return (n < 10 ? '0' : '') + n; }

function clean_(v, max) { return String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, max); }

function esc_(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safeAlert_(msg) {
  try { SpreadsheetApp.getUi().alert(msg); } catch (err) { console.log(msg); }
}

function deniedPage_(email, admin) {
  return '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:520px;margin:12vh auto;padding:28px;' +
    'border:1px solid rgba(80,30,140,.15);border-radius:4px;color:#241436;text-align:center">' +
    '<div style="font-size:22px;font-weight:bold;color:#501e8c;margin-bottom:10px">الدخول غير متاح</div>' +
    (admin && isAllowed_(email)
      ? '<p style="line-height:1.8">لوحة إدارة الحجوزات متاحة لمسؤولي النظام فقط.</p>'
      : '<p style="line-height:1.8">صفحة حجز جلسات Coffee with IT متاحة لمنسوبي الجامعة فقط.<br>' +
        'يرجى تسجيل الدخول بالبريد الجامعي <b>@' + DOMAIN + '</b>.</p>') +
    (email ? '<p style="color:#6b5a80;font-size:13px">الحساب الحالي: ' + esc_(email) + '</p>' : '') +
    '<p style="font-size:13px;color:#6b5a80">للدعم: servicedesk@sr.edu.sa</p></div>';
}
