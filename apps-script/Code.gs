/**
 * Coffee with IT — Booking System  ·  v1.2
 * Sulaiman Al Rajhi University · ICTD · IT Operations Center (ITOC)
 *
 * Container-bound Apps Script for the Google Sheet "Coffee with IT — Bookings".
 * Sheets: Settings · Slots · Bookings · SignIns
 * Deploy as Web app → Execute as: Me · Who has access: Anyone within sr.edu.sa
 */

const APP_VERSION = '1.2';
const DOMAIN = 'sr.edu.sa';
const SHEETS = { SETTINGS: 'Settings', SLOTS: 'Slots', BOOKINGS: 'Bookings', SIGNINS: 'SignIns' };

const BOOKING_HEADERS = ['BookingId', 'Timestamp', 'Email', 'Name', 'Department', 'Extension',
  'Date', 'Time', 'Mode', 'Notes', 'Status', 'CalendarEventId', 'CancelledAt', 'ReminderSent'];
const COL = BOOKING_HEADERS.reduce((o, h, i) => (o[h] = i, o), {});

const MODE_LABEL = { onsite: 'حضوري', zoom: 'عن بُعد (Zoom)' };

/* ───────────────────────────── Web app ───────────────────────────── */

function doGet() {
  const email = activeEmail_();
  if (!isAllowed_(email)) {
    return HtmlService.createHtmlOutput(deniedPage_(email))
      .setTitle('Coffee with IT')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  logSignIn_(email);
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('احجز جلسة Coffee with IT')
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
    myBookings: myBookings_(email)
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
            'الموضوع: ' + (s.Topic || '') + '\n' +
            'طريقة الحضور: ' + MODE_LABEL[mode] + '\n' +
            'رقم الحجز: ' + id + (notes ? '\nملاحظات: ' + notes : '')
        });
        eventId = ev.getId();
      } catch (err) {
        console.warn('Calendar event not created: ' + err);
      }
    }

    const row = [id, Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss'), email, name, dept, ext,
      p.date, p.time, MODE_LABEL[mode], notes, 'Confirmed', eventId, '', ''];
    const sh = sheet_(SHEETS.BOOKINGS);
    sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setNumberFormat('@').setValues([row]);
    SpreadsheetApp.flush();

    result = { id: id, date: p.date, time: p.time, endTime: Utilities.formatDate(end, tz, 'HH:mm'),
      mode: mode, modeLabel: MODE_LABEL[mode], where: where, name: name };
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
    ['NotifyEmail', '', 'بريد الفريق لاستلام نسخة من كل حجز (اختياري)'],
    ['CreateCalendarEvents', 'TRUE', 'إنشاء موعد في التقويم ودعوة الموظف'],
    ['CalendarId', 'primary', 'معرّف التقويم أو primary']
  ]);
  ensureSheet_(SHEETS.SLOTS, ['SlotId', 'Date', 'Time', 'Capacity', 'Active'], []);
  ensureSheet_(SHEETS.BOOKINGS, BOOKING_HEADERS, []);
  ensureSheet_(SHEETS.SIGNINS, ['Email', 'Date', 'Time'], []);
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
        const zoom = r[COL.Mode] === MODE_LABEL.zoom;
        const where = zoom ? String(s.ZoomLink || '') : String(s.OnsiteLocation || '');
        MailApp.sendEmail({
          to: r[COL.Email],
          subject: 'تذكير: جلسة Coffee with IT اليوم الساعة ' + r[COL.Time],
          htmlBody: mailShell_('تذكير بموعد جلستك',
            '<p>نذكّرك بجلسة <b>Coffee with IT</b> اليوم الساعة <b>' + esc_(r[COL.Time]) + '</b>.</p>' +
            '<p>طريقة الحضور: <b>' + esc_(r[COL.Mode]) + '</b><br>' +
            (zoom ? 'رابط Zoom: <a href="' + esc_(where) + '">' + esc_(where) + '</a>' : 'المكان: ' + esc_(where)) + '</p>'),
          name: 'Coffee with IT · ITOC'
        });
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
    .map(b => ({ id: b.id, date: b.date, time: b.time, modeLabel: b.mode }))
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
      time: r[COL.Time], mode: r[COL.Mode], status: r[COL.Status] }));
}

function getSettings_() {
  const s = {};
  sheet_(SHEETS.SETTINGS).getDataRange().getDisplayValues().slice(1)
    .forEach(r => { if (r[0]) s[String(r[0]).trim()] = r[1]; });
  return s;
}

/* ───────────────────────────── Mail ───────────────────────────── */

function sendConfirmation_(email, b, s) {
  const whereHtml = b.mode === 'zoom'
    ? 'رابط Zoom: <a href="' + esc_(b.where) + '">' + esc_(b.where) + '</a>'
    : 'المكان: ' + esc_(b.where);
  const msg = {
    to: email,
    subject: 'تأكيد حجز جلسة Coffee with IT — ' + b.date + ' ' + b.time,
    htmlBody: mailShell_('تم تأكيد حجزك',
      '<p>مرحبًا ' + esc_(b.name) + '،</p>' +
      '<p>تم تأكيد حجزك لجلسة <b>Coffee with IT</b> (' + esc_(s.SessionMinutes || 10) + ' دقائق).</p>' +
      '<table style="border-collapse:collapse;font-size:15px">' +
      row_('رقم الحجز', b.id) + row_('التاريخ', b.date) + row_('الوقت', b.time + ' – ' + b.endTime) +
      row_('طريقة الحضور', b.modeLabel) + '</table>' +
      '<p>' + whereHtml + '</p>' +
      '<p style="color:#6b5a80">لإلغاء الحجز افتح صفحة الحجز ثم «حجوزاتي».</p>'),
    name: 'Coffee with IT · ITOC'
  };
  if (s.NotifyEmail) msg.cc = s.NotifyEmail;
  MailApp.sendEmail(msg);
}

function sendCancellation_(email, r, s) {
  const msg = {
    to: email,
    subject: 'إلغاء حجز جلسة Coffee with IT — ' + r[COL.Date] + ' ' + r[COL.Time],
    htmlBody: mailShell_('تم إلغاء الحجز',
      '<p>تم إلغاء حجزك رقم <b>' + esc_(r[COL.BookingId]) + '</b> بتاريخ ' + esc_(r[COL.Date]) +
      ' الساعة ' + esc_(r[COL.Time]) + '.</p><p>يسعدنا حجزك لموعد آخر في أي وقت.</p>'),
    name: 'Coffee with IT · ITOC'
  };
  if (s.NotifyEmail) msg.cc = s.NotifyEmail;
  MailApp.sendEmail(msg);
}

function mailShell_(title, body) {
  return '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;color:#241436;max-width:560px">' +
    '<div style="background:#501e8c;color:#fff;padding:18px 22px;border-radius:4px 4px 0 0">' +
    '<div style="font-size:13px;opacity:.85">Coffee with IT</div>' +
    '<div style="font-size:20px;font-weight:bold">' + title + '</div></div>' +
    '<div style="border:1px solid rgba(80,30,140,.15);border-top:0;padding:18px 22px;line-height:1.8">' + body +
    '<hr style="border:0;border-top:1px solid #eee;margin:18px 0">' +
    '<div style="font-size:13px;color:#6b5a80">مركز عمليات تقنية المعلومات (ITOC)<br>' +
    'الإدارة التنفيذية للاتصالات وتقنية المعلومات — جامعة سليمان الراجحي<br>' +
    'للدعم: servicedesk@sr.edu.sa</div></div></div>';
}

function row_(k, v) {
  return '<tr><td style="padding:4px 0 4px 18px;color:#6b5a80">' + esc_(k) + '</td>' +
    '<td style="padding:4px 0;font-weight:bold">' + esc_(v) + '</td></tr>';
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

function deniedPage_(email) {
  return '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:520px;margin:12vh auto;padding:28px;' +
    'border:1px solid rgba(80,30,140,.15);border-radius:4px;color:#241436;text-align:center">' +
    '<div style="font-size:22px;font-weight:bold;color:#501e8c;margin-bottom:10px">الدخول غير متاح</div>' +
    '<p style="line-height:1.8">صفحة حجز جلسات Coffee with IT متاحة لمنسوبي الجامعة فقط.<br>' +
    'يرجى تسجيل الدخول بالبريد الجامعي <b>@' + DOMAIN + '</b>.</p>' +
    (email ? '<p style="color:#6b5a80;font-size:13px">الحساب الحالي: ' + esc_(email) + '</p>' : '') +
    '<p style="font-size:13px;color:#6b5a80">للدعم: servicedesk@sr.edu.sa</p></div>';
}
