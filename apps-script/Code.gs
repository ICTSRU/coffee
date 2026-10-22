/**
 * Coffee with IT — Booking System  ·  v3.1
 * Sulaiman Al Rajhi University · ICTD · IT Operations Center (ITOC)
 *
 * Container-bound Apps Script for the Google Sheet "Coffee with IT — Bookings".
 * Sheets: Settings · Slots · Bookings · SignIns · Topics · Ratings · Presenters · Admins
 * Deploy as Web app → Execute as: Me · Who has access: Anyone within sr.edu.sa
 */

const APP_VERSION = '3.1';
const DOMAIN = 'sr.edu.sa';
const SHEETS = { SETTINGS: 'Settings', SLOTS: 'Slots', BOOKINGS: 'Bookings', SIGNINS: 'SignIns', TOPICS: 'Topics', RATINGS: 'Ratings',
  PRESENTERS: 'Presenters', ADMINS: 'Admins' };

const BOOKING_HEADERS = ['BookingId', 'Timestamp', 'Email', 'Name', 'Department', 'Extension',
  'Date', 'Time', 'Mode', 'Notes', 'Status', 'CalendarEventId', 'CancelledAt', 'ReminderSent', 'Attendance', 'Topic', 'ThanksSentAt',
  // v3.1 — filled by admins after the session
  'Presenter', 'AdminNotes', 'DurationMin'];
const COL = BOOKING_HEADERS.reduce((o, h, i) => (o[h] = i, o), {});

const MODE_LABEL = { onsite: 'حضوري', zoom: 'عن بُعد (Zoom)' };
// Zoom meeting used for remote sessions when Settings › ZoomLink is empty or not a valid link.
const DEFAULT_ZOOM_LINK = 'https://us06web.zoom.us/j/81335191824?pwd=Va9wQ6Yyz0NPaOjubMJBaxhqcUd7AR.1';
const DEFAULT_ADMINS = ['m.elmahdy@sr.edu.sa'];   // system owner(s): always admins, the only ones who can manage admin access
// Other admins are managed from the admin dashboard (sheet "Admins"). Settings › AdminEmails is still honoured (legacy).
const ADMIN_HEADERS = ['Email', 'Name', 'Active', 'AddedAt', 'AddedBy'];
const PRESENTER_HEADERS = ['Name', 'Email', 'Active', 'CreatedAt', 'CreatedBy'];
const MAX_DURATION_MIN = 240;

/* ITOC Team Directory v1.0 (2026-10-14) — source for the presenter and admin drop-down lists. */
const TEAM = [
  { name: 'Dr. Nasser Abounar', email: 'nabounar@sr.edu.sa', role: 'الرئيس التنفيذي', sector: 'ICTD' },
  { name: 'Mohamed ElMahdy', email: 'm.elmahdy@sr.edu.sa', role: 'مدير التشغيل', sector: 'ITOC' },
  { name: 'Mohamed Nawaz', email: 'm.nawaz@sr.edu.sa', role: 'مدير الشبكات والأمن السيبراني', sector: 'NOC' },
  { name: 'Mohamed Omar', email: 'm.omar@sr.edu.sa', role: 'مدير مركز الدعم والخدمات الرقمية', sector: 'DSSC' },
  { name: 'Mohamed Saleh', email: 'm.saleh@sr.edu.sa', role: 'مطور تطبيقات', sector: 'AAU' },
  { name: 'Ammar Alrowedan', email: 'a.alrowedan@sr.edu.sa', role: 'مسئول الدعم الفني - التعليم الإلكتروني', sector: 'DSSC' },
  { name: 'Nayed Alrashidi', email: 'n.alrashidi@sr.edu.sa', role: 'مسئول الدعم الفني', sector: 'DSSC' },
  { name: 'Abd Alazez Alawaji', email: 'a.alawaji@sr.edu.sa', role: 'مسئول الدعم الفني', sector: 'DSSC' },
  { name: 'Azzam Alaqeel', email: 'a.alaqeel@sr.edu.sa', role: 'مسئول الدعم الفني - الصوتيات والمرئيات', sector: 'DSSC' },
  { name: 'Asma Alolayan', email: 'a.alolayan@sr.edu.sa', role: 'مسئول الدعم الفني - شطر الطالبات', sector: 'DSSC' },
  { name: 'Shath Albusyli', email: 's.albusayli@sr.edu.sa', role: 'مسئول الدعم الفني - شطر الطالبات', sector: 'DSSC' },
  { name: 'Inshrah Almutairi', email: 'i.almutairi@sr.edu.sa', role: 'مسئول الدعم الفني - شطر الطالبات', sector: 'DSSC' },
  { name: 'عاطف النادي', email: 'a.elnadi@sr.edu.sa', role: 'مسئول الشبكات', sector: 'NOC' },
  { name: 'سراج', email: '', role: 'فني صوتيات ومرئيات', sector: 'DSSC' }
];
const ATTENDANCE = { Attended: 'حضر', 'No-show': 'لم يحضر' };
// Booking web app (/exec) — used to build rating links in e-mails. Settings › WebAppUrl overrides it.
const DEFAULT_WEBAPP_URL = 'https://script.google.com/a/macros/sr.edu.sa/s/AKfycby3kz3l_mYr-xGakO9TQGQTJF4aiCTKNUbHYLTUJiOS1Q6RddFqVIcOjLa-4I_CBZMsbg/exec';

/* Session evaluation — same model as the Event Attendance platform:
   one overall-satisfaction question (5-point Likert) + one open question; one response per booking. */
const RATING_HEADERS = ['Timestamp', 'BookingId', 'Email', 'Name', 'Department', 'Topic', 'SessionDate', 'SessionTime', 'Mode', 'Rating', 'Comment', 'UpdatedAt'];
const RATE_Q_AR = 'ما مدى رضاك العام عن الجلسة؟';
const RATE_Q_EN = 'Overall, how satisfied were you with the session?';
const RATE_LABELS = [['غير راضٍ إطلاقًا', 'Very dissatisfied'], ['غير راضٍ', 'Dissatisfied'], ['محايد', 'Neutral'], ['راضٍ', 'Satisfied'], ['راضٍ جدًا', 'Very satisfied']];
const RATE_OPEN_AR = 'ما مقترحاتك لتحسين جلسات Coffee with IT؟';
const RATE_OPEN_EN = 'What would you suggest to improve Coffee with IT sessions?';

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
  if (e && e.parameter && e.parameter.page === 'rate') {
    return HtmlService.createHtmlOutputFromFile('Rate')
      .setTitle('تقييم جلسة Coffee with IT')
      .setFaviconUrl(ASSET_URL + 'cwit-favicon.png')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (wantsAdmin) {
    return HtmlService.createHtmlOutputFromFile('Admin')
      .setTitle('لوحة إدارة حجوزات Coffee with IT')
      .setFaviconUrl(ASSET_URL + 'cwit-favicon.png')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('احجز جلسة Coffee with IT')
    .setFaviconUrl(ASSET_URL + 'cwit-favicon.png')
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
  // Compare normalised text: extra/trailing spaces, non-breaking or invisible characters in the Topics sheet
  // (or in the browser value) must not reject a topic the user picked from the list.
  const activeTopics = topicRows_().filter(t => t.active).map(t => t.name);
  const wanted = topicKey_(clean_(p.topic, 300));
  const topic = activeTopics.filter(t => topicKey_(t) === wanted)[0] || norm_(clean_(p.topic, 150));
  if (activeTopics.length && activeTopics.map(topicKey_).indexOf(wanted) === -1)
    throw new Error('الموضوع المختار لم يعد متاحًا — حدّث الصفحة واختر موضوعًا من القائمة.');
  const mode = p.mode === 'zoom' ? 'zoom' : (p.mode === 'onsite' ? 'onsite' : '');
  if (!name || !dept || !mode || !/^\d{4}-\d{2}-\d{2}$/.test(p.date || '') || !/^\d{2}:\d{2}$/.test(p.time || '')) {
    throw new Error('بيانات الحجز غير مكتملة.');
  }

  const sessionMin = Number(s.SessionMinutes) || 10;
  const where = mode === 'zoom' ? zoomLink_(s) : String(s.OnsiteLocation || '');
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
        const cal = calendar_(s);
        const evOpts = {
          location: where,
          description: 'جلسة Coffee with IT (' + sessionMin + ' دقائق)\n' +
            'الموضوع: ' + (topic || s.Topic || '') + '\n' +
            'طريقة الحضور: ' + MODE_LABEL[mode] + '\n' +
            'رقم الحجز: ' + id + (mode === 'zoom' ? '\nرابط Zoom: ' + where : '') + (notes ? '\nملاحظات: ' + notes : '')
        };
        eventId = createInviteWithoutMeet_(cal, 'Coffee with IT — ' + name, start, end, evOpts, email);
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
    topic: r[COL.Topic] || '', thanksSentAt: r[COL.ThanksSentAt] || '',
    presenter: r[COL.Presenter] || '', adminNotes: r[COL.AdminNotes] || '', durationMin: Number(r[COL.DurationMin]) || 0,
    ended: toDateTime_(r[COL.Date], r[COL.Time]).getTime() + (Number(s.SessionMinutes) || 10) * 60000 <= Date.now()
  }));
  const ratings = ratingRows_().map(x => ({ bookingId: x.BookingId, email: x.Email, name: x.Name, department: x.Department,
    topic: x.Topic, date: x.SessionDate, time: x.SessionTime, mode: x.Mode, rating: Number(x.Rating) || 0,
    comment: x.Comment, at: x.UpdatedAt || x.Timestamp }));
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
    signIns: signIns, sheetUrl: SpreadsheetApp.getActive().getUrl(),
    ratings: ratings, automation: automationOn_(), autoThanks: String(s.AutoThanks).toUpperCase() !== 'FALSE',
    rate: { q: RATE_Q_AR, labels: RATE_LABELS.map(l => l[0]) },
    sessionMinutes: Number(s.SessionMinutes) || 10,
    presenters: presenterRows_(), team: TEAM,
    admins: adminList_(), isOwner: isOwner_(email), owners: DEFAULT_ADMINS
  };
}

/* ─────────────── v3.1 · Session details: presenter, admin notes, actual duration ─────────────── */

/** d = {presenter, adminNotes, durationMin}. The presenter must come from the Presenters list (drop-down). */
function setSessionDetails(id, d) {
  requireAdmin_();
  d = d || {};
  const presenter = norm_(clean_(d.presenter, 80));
  const notes = clean_(d.adminNotes, 500);
  const raw = String(d.durationMin == null ? '' : d.durationMin).trim();
  const dur = raw === '' ? '' : Math.round(Number(raw));
  if (dur !== '' && (!isFinite(dur) || dur < 1 || dur > MAX_DURATION_MIN))
    throw new Error('الوقت المستغرق يجب أن يكون بين 1 و' + MAX_DURATION_MIN + ' دقيقة.');
  if (presenter && !presenterRows_().some(p => p.name === presenter))
    throw new Error('اختر مقدم الجلسة من القائمة.');
  ensureBookingHeaders_();
  const sh = sheet_(SHEETS.BOOKINGS);
  const ids = sh.getRange(2, COL.BookingId + 1, Math.max(1, sh.getLastRow() - 1), 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) {
      sh.getRange(i + 2, COL.Presenter + 1, 1, 3).setNumberFormat('@').setValues([[presenter, notes, String(dur)]]);
      return { ok: true, id: id, presenter: presenter, adminNotes: notes, durationMin: Number(dur) || 0 };
    }
  }
  throw new Error('لم يتم العثور على الحجز.');
}

/* ─────────────── v3.1 · Presenters list (drop-down source) ─────────────── */

function presentersSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEETS.PRESENTERS);
  if (!sh) {
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    sh = ensureSheet_(SHEETS.PRESENTERS, PRESENTER_HEADERS, TEAM.map(t => [t.name, t.email, 'TRUE', now, 'Team Directory v1.0']));
  }
  return sh;
}

function presenterRows_() {
  return presentersSheet_().getDataRange().getDisplayValues().slice(1).filter(r => norm_(r[0]))
    .map(r => ({ name: norm_(r[0]), email: String(r[1] || '').trim().toLowerCase(), active: String(r[2]).toUpperCase() !== 'FALSE' }));
}

/** Adds a presenter (admin). name is required; email optional. Returns the full list. */
function addPresenter(name, email) {
  const by = requireAdmin_();
  const n = norm_(clean_(name, 80));
  const e = String(email || '').trim().toLowerCase();
  if (!n) throw new Error('اختر أو اكتب اسم مقدم الجلسة.');
  if (e && !isAllowed_(e)) throw new Error('البريد يجب أن يكون بالنطاق @' + DOMAIN);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    if (presenterRows_().some(p => topicKey_(p.name) === topicKey_(n))) throw new Error('هذا الاسم موجود في القائمة بالفعل.');
    const sh = presentersSheet_();
    sh.getRange(sh.getLastRow() + 1, 1, 1, 5).setNumberFormat('@').setValues([[n, e, 'TRUE',
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'), by]]);
  } finally { lock.releaseLock(); }
  return presenterRows_();
}

/** Shows / hides a presenter in the drop-down. Past sessions keep their presenter. */
function setPresenterActive(name, active) {
  requireAdmin_();
  const sh = presentersSheet_();
  const vals = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < vals.length; i++) {
    if (topicKey_(vals[i][0]) === topicKey_(name)) { sh.getRange(i + 1, 3).setNumberFormat('@').setValue(active ? 'TRUE' : 'FALSE'); return presenterRows_(); }
  }
  throw new Error('الاسم غير موجود.');
}

/* ─────────────── v3.1 · Admin dashboard access ─────────────── */

function adminsSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEETS.ADMINS);
  if (!sh) {
    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    // carry over anyone already listed in Settings › AdminEmails
    const legacy = String(getSettingsSafe_().AdminEmails || '').split(/[,;\s]+/).map(x => x.trim().toLowerCase())
      .filter(x => isAllowed_(x) && DEFAULT_ADMINS.indexOf(x) === -1);
    sh = ensureSheet_(SHEETS.ADMINS, ADMIN_HEADERS, legacy.filter((x, i, a) => a.indexOf(x) === i)
      .map(x => [x, teamName_(x), 'TRUE', now, 'Settings › AdminEmails']));
  }
  return sh;
}

function adminSheetRows_() {
  return adminsSheet_().getDataRange().getDisplayValues().slice(1).filter(r => String(r[0]).trim())
    .map(r => ({ email: String(r[0]).trim().toLowerCase(), name: r[1] || '', active: String(r[2]).toUpperCase() !== 'FALSE',
      addedAt: r[3] || '', addedBy: r[4] || '' }));
}

/** Owners first, then the Admins sheet. */
function adminList_() {
  const owners = DEFAULT_ADMINS.map(e => ({ email: e, name: teamName_(e), active: true, owner: true, addedAt: '', addedBy: '' }));
  return owners.concat(adminSheetRows_().filter(a => DEFAULT_ADMINS.indexOf(a.email) === -1).map(a => Object.assign(a, { owner: false })));
}

function teamName_(email) {
  const t = TEAM.filter(x => x.email && x.email === String(email || '').toLowerCase())[0];
  return t ? t.name : '';
}

function isOwner_(email) {
  return DEFAULT_ADMINS.map(x => x.toLowerCase()).indexOf(String(email || '').toLowerCase()) !== -1;
}

function requireOwner_() {
  const email = requireAdmin_();
  if (!isOwner_(email)) throw new Error('إدارة صلاحيات الدخول متاحة لمالك النظام فقط (' + DEFAULT_ADMINS.join('، ') + ').');
  return email;
}

/** Grants admin-dashboard access (owner only). Re-activates the address if it was disabled. */
function addAdmin(email, name) {
  const by = requireOwner_();
  const e = String(email || '').trim().toLowerCase();
  if (!isAllowed_(e) || !/^[^@\s]+@[^@\s]+$/.test(e)) throw new Error('أدخل بريدًا جامعيًا صحيحًا @' + DOMAIN);
  if (isOwner_(e)) throw new Error('هذا الحساب مالك النظام ولديه الصلاحية دائمًا.');
  const n = clean_(name, 80) || teamName_(e);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = adminsSheet_();
    const vals = sh.getDataRange().getDisplayValues();
    for (let i = 1; i < vals.length; i++) {
      if (String(vals[i][0]).trim().toLowerCase() === e) {
        if (String(vals[i][2]).toUpperCase() !== 'FALSE') throw new Error('هذا الحساب لديه صلاحية الدخول بالفعل.');
        sh.getRange(i + 1, 2, 1, 2).setNumberFormat('@').setValues([[n || vals[i][1], 'TRUE']]);
        return adminList_();
      }
    }
    sh.getRange(sh.getLastRow() + 1, 1, 1, 5).setNumberFormat('@').setValues([[e, n, 'TRUE',
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'), by]]);
  } finally { lock.releaseLock(); }
  return adminList_();
}

/** Suspends / restores an admin (owner only). The owner cannot be changed here. */
function setAdminActive(email, active) {
  requireOwner_();
  const e = String(email || '').trim().toLowerCase();
  if (isOwner_(e)) throw new Error('لا يمكن تعديل صلاحية مالك النظام.');
  const sh = adminsSheet_();
  const vals = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][0]).trim().toLowerCase() === e) { sh.getRange(i + 1, 3).setNumberFormat('@').setValue(active ? 'TRUE' : 'FALSE'); return adminList_(); }
  }
  throw new Error('الحساب غير موجود في قائمة الصلاحيات.');
}

/** Removes an admin row completely (owner only). */
function removeAdmin(email) {
  requireOwner_();
  const e = String(email || '').trim().toLowerCase();
  if (isOwner_(e)) throw new Error('لا يمكن حذف مالك النظام.');
  const sh = adminsSheet_();
  const vals = sh.getDataRange().getDisplayValues();
  for (let i = vals.length - 1; i >= 1; i--) {
    if (String(vals[i][0]).trim().toLowerCase() === e) sh.deleteRow(i + 1);
  }
  return adminList_();
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
  const t = norm_(clean_(name, 150));
  if (!t) throw new Error('اكتب اسم الموضوع.');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    if (topicRows_().some(x => topicKey_(x.name) === topicKey_(t))) throw new Error('هذا الموضوع موجود بالفعل.');
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
    if (topicKey_(vals[i][0]) === topicKey_(name)) { sh.getRange(i + 1, 2).setNumberFormat('@').setValue(active ? 'TRUE' : 'FALSE'); return topicRows_(); }
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
  return topicsSheet_().getDataRange().getDisplayValues().slice(1).filter(r => norm_(r[0]))
    .map(r => ({ name: norm_(r[0]), active: String(r[1]).toUpperCase() !== 'FALSE', createdAt: r[2] || '', createdBy: r[3] || '' }));
}

function isAdmin_(email) {
  const e = String(email || '').toLowerCase();
  if (!e) return false;
  if (isOwner_(e)) return true;
  try { if (adminSheetRows_().some(a => a.active && a.email === e)) return true; } catch (err) { console.warn(err); }
  // legacy: Settings › AdminEmails (an address suspended in the Admins sheet stays blocked)
  const extra = String(getSettingsSafe_().AdminEmails || '').split(/[,;\s]+/).filter(Boolean).map(x => x.toLowerCase());
  if (extra.indexOf(e) === -1) return false;
  try { return !adminSheetRows_().some(a => a.email === e && !a.active); } catch (err) { return true; }
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

/* ─────────────────────── Session evaluation (rating) ─────────────────────── */

/** Rating page: booking summary + previous answer. Only the attendee (or an admin) may open it. */
function getRateData(id) {
  const email = requireUser_();
  const s = getSettings_();
  const r = findBooking_(id);
  if (!r) throw new Error('لم يتم العثور على الحجز. تأكد من فتح الرابط من رسالة التقييم.');
  if (r.row[COL.Email].toLowerCase() !== email && !isAdmin_(email)) throw new Error('رابط التقييم خاص بصاحب الحجز. سجّل الدخول بالحساب الذي حجزت به.');
  if (r.row[COL.Status] !== 'Confirmed') throw new Error('هذا الحجز ملغى، لا يمكن تقييمه.');
  const mins = Number(s.SessionMinutes) || 10;
  const end = new Date(toDateTime_(r.row[COL.Date], r.row[COL.Time]).getTime() + mins * 60000);
  const prev = ratingRows_().filter(x => x.BookingId === id)[0];
  return {
    version: APP_VERSION,
    booking: { id: id, name: r.row[COL.Name], date: r.row[COL.Date], dateLabel: arDate_(r.row[COL.Date]), time: r.row[COL.Time],
      endTime: addMinutes_(r.row[COL.Time], mins), topic: r.row[COL.Topic] || String(s.Topic || ''), modeLabel: r.row[COL.Mode] },
    ended: end <= new Date(),
    previous: prev ? { rating: Number(prev.Rating) || 0, comment: prev.Comment || '' } : null,
    q: { ar: RATE_Q_AR, en: RATE_Q_EN, open_ar: RATE_OPEN_AR, open_en: RATE_OPEN_EN, labels: RATE_LABELS }
  };
}

/** Saves (or updates) the attendee's rating: one response per booking. */
function submitRating(id, rating, comment) {
  const email = requireUser_();
  const s = getSettings_();
  const n = parseInt(rating, 10);
  if (!(n >= 1 && n <= 5)) throw new Error('يرجى اختيار التقييم من 1 إلى 5.');
  const r = findBooking_(id);
  if (!r || r.row[COL.Email].toLowerCase() !== email) throw new Error('رابط التقييم خاص بصاحب الحجز.');
  if (r.row[COL.Status] !== 'Confirmed') throw new Error('هذا الحجز ملغى، لا يمكن تقييمه.');
  const end = toDateTime_(r.row[COL.Date], r.row[COL.Time]).getTime() + (Number(s.SessionMinutes) || 10) * 60000;
  if (end > Date.now()) throw new Error('يمكنك تقييم الجلسة بعد انتهائها.');
  const tz = Session.getScriptTimeZone(), now = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
  const text = clean_(comment, 1000);
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sh = ratingsSheet_();
    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 2, sh.getLastRow() - 1, 1).getDisplayValues().map(x => x[0]) : [];
    const i = ids.indexOf(id);
    if (i !== -1) {
      sh.getRange(i + 2, 10, 1, 3).setNumberFormat('@').setValues([[String(n), text, now]]);
    } else {
      const b = r.row;
      sh.getRange(sh.getLastRow() + 1, 1, 1, RATING_HEADERS.length).setNumberFormat('@').setValues([[now, id, b[COL.Email], b[COL.Name],
        b[COL.Department], b[COL.Topic] || String(s.Topic || ''), b[COL.Date], b[COL.Time], b[COL.Mode], String(n), text, '']]);
    }
  } finally { lock.releaseLock(); }
  return { ok: true, rating: n };
}

/** Admin: send (or resend) the thank-you + rating e-mail for one booking. */
function sendThanks(id) {
  requireAdmin_();
  const s = getSettings_();
  const r = findBooking_(id);
  if (!r || r.row[COL.Status] !== 'Confirmed') throw new Error('الحجز غير موجود أو ملغى.');
  if (!sessionEnded_(r.row, s)) throw new Error('لم تنتهِ الجلسة بعد.');
  thanksAndMark_(r, s);
  return getAdminData();
}

/** Admin: send the thank-you + rating e-mail to every ended session that has not received it (no-shows skipped). */
function sendPendingThanks() {
  requireAdmin_();
  const n = processThanks_(false);
  const d = getAdminData(); d.sentCount = n;
  return d;
}

/** Admin: send a sample thank-you e-mail to yourself. */
function sendThanksTest() {
  const email = requireAdmin_();
  const s = getSettings_();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const b = { id: 'CWI-TEST', name: 'تجربة', date: today, time: '10:00', endTime: addMinutes_('10:00', Number(s.SessionMinutes) || 10),
    topic: String(s.Topic || ''), modeLabel: 'حضوري' };
  const from = mail_({ to: email, subject: '[تجربة] شكرًا لحضورك جلسة Coffee with IT — قيّم الجلسة', htmlBody: thanksHtml_(b, s) }, s);
  return { ok: true, to: email, from: from };
}

/** Admin: turn on the hourly automation (reminders + thank-you e-mails). */
function enableAutomation() {
  requireAdmin_();
  installAutomation_();
  return { automation: automationOn_() };
}

/** Hourly trigger: reminders before sessions, then thank-you + rating e-mails after them. */
function hourlyJobs() {
  try { sendReminders(); } catch (err) { console.warn('reminders: ' + err); }
  try {
    if (String(getSettings_().AutoThanks).toUpperCase() !== 'FALSE') processThanks_(true);
  } catch (err) { console.warn('thanks: ' + err); }
}

/** auto=true: only sessions that ended ThanksDelayMinutes ago and within the last 7 days. */
function processThanks_(auto) {
  const s = getSettings_();
  ensureBookingHeaders_();
  const sh = sheet_(SHEETS.BOOKINGS);
  const data = sh.getDataRange().getDisplayValues();
  const mins = Number(s.SessionMinutes) || 10, delay = (Number(s.ThanksDelayMinutes) || 30) * 60000;
  const now = Date.now();
  let sent = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[COL.BookingId] || row[COL.Status] !== 'Confirmed' || row[COL.ThanksSentAt] || row[COL.Attendance] === 'No-show') continue;
    const end = toDateTime_(row[COL.Date], row[COL.Time]).getTime() + mins * 60000;
    if (end > now) continue;
    if (auto && (now < end + delay || now - end > 7 * 86400000)) continue;
    try { thanksAndMark_({ row: row, index: i }, s); sent++; } catch (err) { console.warn(err); }
  }
  return sent;
}

function thanksAndMark_(r, s) {
  const b = { id: r.row[COL.BookingId], name: r.row[COL.Name], date: r.row[COL.Date], time: r.row[COL.Time],
    endTime: addMinutes_(r.row[COL.Time], Number(s.SessionMinutes) || 10), topic: r.row[COL.Topic] || String(s.Topic || ''),
    modeLabel: r.row[COL.Mode] };
  mail_({ to: r.row[COL.Email], subject: 'شكرًا لحضورك جلسة Coffee with IT — قيّم الجلسة', htmlBody: thanksHtml_(b, s) }, s);
  sheet_(SHEETS.BOOKINGS).getRange(r.index + 1, COL.ThanksSentAt + 1).setNumberFormat('@')
    .setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'));
}

function sessionEnded_(row, s) {
  return toDateTime_(row[COL.Date], row[COL.Time]).getTime() + (Number(s.SessionMinutes) || 10) * 60000 <= Date.now();
}

/** { row, index } — index is the 0-based position in getDataRange() (header = 0). */
function findBooking_(id) {
  ensureBookingHeaders_();
  const data = sheet_(SHEETS.BOOKINGS).getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) if (data[i][COL.BookingId] === id) return { row: data[i], index: i };
  return null;
}

function ratingsSheet_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.RATINGS);
  return sh || ensureSheet_(SHEETS.RATINGS, RATING_HEADERS, []);
}

function ratingRows_() {
  const v = ratingsSheet_().getDataRange().getDisplayValues();
  return v.slice(1).filter(r => r[1]).map(r => RATING_HEADERS.reduce((o, h, i) => (o[h] = r[i] || '', o), {}));
}

function installAutomation_() {
  ScriptApp.getProjectTriggers().filter(t => ['sendReminders', 'hourlyJobs'].indexOf(t.getHandlerFunction()) !== -1)
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('hourlyJobs').timeBased().everyHours(1).create();
}

function automationOn_() {
  try { return ScriptApp.getProjectTriggers().some(t => ['hourlyJobs', 'sendReminders'].indexOf(t.getHandlerFunction()) !== -1); }
  catch (err) { return false; }
}

function webAppUrl_(s) {
  const v = String((s && s.WebAppUrl) || '').trim();
  return /^https:\/\/script\.google\.com\//.test(v) ? v : DEFAULT_WEBAPP_URL;
}

function rateLink_(s, id, n) {
  return webAppUrl_(s) + '?page=rate&id=' + encodeURIComponent(id) + (n ? '&r=' + n : '');
}

/* ─────────────────────────── Admin (menu) ─────────────────────────── */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Coffee with IT')
    .addItem('1) إعداد الأوراق (أول مرة)', 'setup')
    .addItem('2) توليد المواعيد من الإعدادات', 'generateSlots')
    .addSeparator()
    .addItem('تفعيل الإرسال التلقائي: التذكير + الشكر والتقييم (كل ساعة)', 'installReminderTrigger')
    .addSeparator()
    .addItem('فحص المُرسِل والتقويم (ITOC)', 'checkSenderAndCalendar')
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
    ['ZoomLink', DEFAULT_ZOOM_LINK, 'يُرسل في البريد لمن يختار الحضور عن بُعد'],
    ['MailFrom', DEFAULT_MAIL_FROM, 'عنوان المُرسِل لكل الرسائل (تسجيل/إلغاء/تذكير/شكر وتقييم) — يجب أن يكون حساب النشر نفسه أو اسمًا مستعارًا مُفعّلًا «إرسال بريد باسم»'],
    ['NotifyEmail', 'servicedesk@sr.edu.sa;m.elmahdy@sr.edu.sa', 'نسخة مخفية (BCC) من كل رسالة تأكيد/إلغاء/تذكير — افصل بين العناوين بـ ;'],
    ['CreateCalendarEvents', 'TRUE', 'إنشاء موعد في التقويم ودعوة الموظف'],
    ['CalendarId', DEFAULT_CALENDAR_ID, 'التقويم الذي تُنشأ عليه الدعوات (المنظِّم) — itoc@sr.edu.sa، أو me لتقويم حساب النشر'],
    ['AdminEmails', '', '(قديم) تُدار صلاحيات لوحة الإدارة الآن من اللوحة نفسها — ورقة Admins. m.elmahdy@sr.edu.sa مالك النظام دائمًا'],
    ['AutoThanks', 'TRUE', 'إرسال رسالة الشكر والتقييم تلقائيًا بعد انتهاء الجلسة (يتطلب تفعيل الإرسال التلقائي)'],
    ['ThanksDelayMinutes', '30', 'بعد كم دقيقة من انتهاء الجلسة تُرسل رسالة الشكر'],
    ['WebAppUrl', DEFAULT_WEBAPP_URL, 'رابط تطبيق الحجز (exec) — يُستخدم في روابط التقييم']
  ]);
  ensureSheet_(SHEETS.SLOTS, ['SlotId', 'Date', 'Time', 'Capacity', 'Active'], []);
  ensureSheet_(SHEETS.BOOKINGS, BOOKING_HEADERS, []);
  ensureSheet_(SHEETS.SIGNINS, ['Email', 'Date', 'Time'], []);
  topicsSheet_();
  ratingsSheet_();
  presentersSheet_();
  adminsSheet_();
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
  installAutomation_();
  safeAlert_('تم تفعيل الإرسال التلقائي كل ساعة: التذكير قبل الجلسة، ورسالة الشكر والتقييم بعدها.');
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
// Blind copy of every booking e-mail. Settings › NotifyEmail overrides this list (separate addresses with ; or ,).
const DEFAULT_COPY_EMAILS = ['servicedesk@sr.edu.sa', 'm.elmahdy@sr.edu.sa'];
const MAIL_FROM_NAME = 'Coffee with IT · ITOC';
// Sender address of every e-mail (registration, cancellation, reminder, thank-you + rating). Settings › MailFrom overrides it.
// It must be the deploying account itself or a verified Gmail "Send mail as" alias of that account.
const DEFAULT_MAIL_FROM = 'itoc@sr.edu.sa';
const MAIL_REPLY_TO = 'servicedesk@sr.edu.sa';
const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const C = { purple: '#501e8c', dark: '#3a1464', light: '#f0ebf8', blue: '#0a6eaa', blueLight: '#e6f3fa',
  ink: '#241436', muted: '#6b5a80', line: '#e7e1f0', bg: '#f7f5fb', red: '#b42318', redLight: '#fef3f2', green: '#067647' };
// Cairo first (Apple Mail, iOS Mail, Outlook for Mac, Thunderbird). Gmail and Outlook for Windows fall back to Tahoma.
const FONT = "'Cairo', Tahoma, 'Segoe UI', Arial, sans-serif";
const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap';

/** Every booking e-mail goes to the attendee, with a blind copy (BCC) to the copy list. */
function send_(to, subject, html, s) {
  const msg = { to: to, subject: subject, htmlBody: html };
  const bcc = copyList_(s, to);
  if (bcc.length) msg.bcc = bcc.join(',');
  mail_(msg, s);
}

/** The configured sender: Settings › MailFrom or DEFAULT_MAIL_FROM. */
function mailFrom_(s) {
  const v = String((s && s.MailFrom) || '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? v : DEFAULT_MAIL_FROM;
}

/**
 * Sends one e-mail from the ITOC address (GmailApp, so a "from" alias can be used).
 * If the deploying account cannot send as that address, the message still goes out from the account itself
 * (bookings never fail because of the sender) and a warning is written to the execution log.
 * Returns the address actually used.
 */
function mail_(msg, s) {
  const want = mailFrom_(s);
  const me = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  const opts = { htmlBody: msg.htmlBody, name: MAIL_FROM_NAME, replyTo: MAIL_REPLY_TO };
  if (msg.bcc) opts.bcc = msg.bcc;
  const inline = mailImages_(msg.htmlBody);
  if (Object.keys(inline).length) opts.inlineImages = inline;
  let used = me;
  if (want === me) {
    used = want;
  } else if (GmailApp.getAliases().map(a => String(a).toLowerCase()).indexOf(want) !== -1) {
    opts.from = want; used = want;
  } else {
    console.warn('MailFrom ' + want + ' is not a "Send mail as" alias of ' + me + ' — sent from ' + me + ' instead.');
  }
  const text = String(msg.htmlBody || '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  GmailApp.sendEmail(msg.to, msg.subject, text, opts);
  return used;
}

/** NotifyEmail (";" "," or spaces) or DEFAULT_COPY_EMAILS — valid, de-duplicated, never the attendee themself. */
function copyList_(s, to) {
  const raw = String((s && s.NotifyEmail) || '').trim();
  const list = raw ? raw.split(/[;,\s]+/) : DEFAULT_COPY_EMAILS.slice();
  const seen = {}, self = String(to || '').toLowerCase();
  return list.map(x => x.trim().toLowerCase())
    .filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x) && x !== self && !seen[x] && (seen[x] = true));
}

function sendConfirmation_(email, b, s) {
  send_(email, 'تأكيد حجز جلسة Coffee with IT — ' + arDate_(b.date) + ' · ' + b.time, confirmationHtml_(b, s), s);
}

function sendCancellation_(email, r, s) {
  const b = { id: r[COL.BookingId], date: r[COL.Date], time: r[COL.Time], name: r[COL.Name], modeLabel: r[COL.Mode], topic: r[COL.Topic] || '' };
  send_(email, 'إلغاء حجز جلسة Coffee with IT — ' + arDate_(b.date) + ' · ' + b.time, cancellationHtml_(b, s), s);
}

function sendReminderMail_(r, s) {
  const zoom = r[COL.Mode] === MODE_LABEL.zoom;
  const b = { id: r[COL.BookingId], date: r[COL.Date], time: r[COL.Time], name: r[COL.Name], topic: r[COL.Topic] || '',
    mode: zoom ? 'zoom' : 'onsite', modeLabel: r[COL.Mode],
    where: zoom ? zoomLink_(s) : String(s.OnsiteLocation || ''),
    endTime: addMinutes_(r[COL.Time], Number(s.SessionMinutes) || 10) };
  send_(r[COL.Email], 'تذكير: جلسة Coffee with IT اليوم الساعة ' + b.time, reminderHtml_(b, s), s);
}

/* ---------- templates (pure: no Apps Script services, easy to preview) ---------- */

function confirmationHtml_(b, s) {
  const mins = Number(s.SessionMinutes) || 10;
  const topic = b.topic || s.Topic || '';
  const calendarInvite = String(s.CreateCalendarEvents).toUpperCase() === 'TRUE';
  const zoom = b.mode === 'zoom';
  const body =
    p_('مرحبًا <b>' + esc_(b.name) + '</b>،') +
    p_('يسعدنا إبلاغك بأنه <b>تم تأكيد حجزك</b> في جلسة <b>' + ltrSpan_('Coffee with IT') + '</b>' +
      (topic ? ' بعنوان «<b>' + keepLatin_(esc_(topic)) + '</b>»' : '') + '، ونتطلع إلى لقائك.') +
    sectionTitle_('تفاصيل الحجز') +
    detailsCard_([
      ['الموضوع', keepLatin_(esc_(topic))],
      ['التاريخ', esc_(arDate_(b.date))],
      ['الوقت', timeRange_(b)],
      ['مدة الجلسة', mins + ' دقائق'],
      ['طريقة الحضور', modePill_(b.mode, b.modeLabel)],
      ['رقم الحجز', '<span style="font-family:Consolas,Menlo,monospace;background:' + C.light + ';color:' + C.dark + ';padding:2px 8px;border-radius:4px">' + esc_(b.id) + '</span>']
    ]) +
    whereBlock_(b) +
    (calendarInvite
      ? note_('أرسلنا إليك أيضًا دعوة في تقويم Google بموعد الجلسة، يُرجى قبولها ليظهر الموعد في تقويمك.')
      : '<div style="margin:18px 0 4px">' + button_('أضف الموعد إلى التقويم', calendarLink_(b, s), C.blue) + '</div>') +
    sectionTitle_('قبل الجلسة') +
    checklist_(zoom
      ? ['تأكد من تثبيت تطبيق Zoom وتجربة الصوت والصورة مسبقًا.', 'ادخل إلى الاجتماع من الرابط أعلاه قبل الموعد بدقيقتين.', 'جهّز أسئلتك أو الحالات التي تودّ مناقشتها.']
      : ['نرجو الحضور قبل الموعد بدقيقتين.', 'جهّز أسئلتك أو الحالات التي تودّ مناقشتها.']) +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;border-top:1px solid ' + C.line + '"><tr>' +
      '<td style="padding-top:18px;font-size:14px;color:' + C.muted + '">تغيّرت ظروفك؟ يمكنك إدارة الحجز أو إلغاؤه ليُتاح الموعد لزملائك.</td></tr>' +
      '<tr><td style="padding-top:10px">' + button_('إدارة الحجز', SITE_URL, C.purple) + '</td></tr></table>';
  return layout_({ preheader: 'حجزك مؤكد: ' + arDate_(b.date) + ' الساعة ' + b.time + ' — ' + b.modeLabel,
    title: 'تم تأكيد حجزك', subtitle: arDate_(b.date) + ' · الساعة ' + b.time, accent: C.purple, body: body });
}

function sectionTitle_(t) {
  return '<div style="margin:22px 0 8px;font-weight:bold;font-size:16px;color:' + C.dark + '">' + esc_(t) + '</div>';
}

/** Numbered checklist as a table (no emoji, no list bullets that some clients misplace in RTL). */
function checklist_(items) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + items.map(function (t, i) {
    return '<tr><td width="30" valign="top" style="padding:4px 0">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="22" height="22" align="center" valign="middle" bgcolor="' + C.light + '" ' +
      'style="width:22px;height:22px;background:' + C.light + ';border-radius:11px;color:' + C.purple + ';font-size:12px;font-weight:bold;line-height:22px;text-align:center">' + (i + 1) + '</td></tr></table></td>' +
      '<td valign="top" style="padding:4px 0;color:' + C.ink + ';font-size:15px">' + esc_(t) + '</td></tr>';
  }).join('') + '</table>';
}

function cancellationHtml_(b, s) {
  const body =
    p_('مرحبًا <b>' + esc_(b.name || '') + '</b>،') +
    p_('تم إلغاء حجزك لجلسة <b>' + ltrSpan_('Coffee with IT') + '</b> بناءً على طلبك، وأصبح الموعد متاحًا لزملائك.') +
    detailsCard_([
      ['رقم الحجز', '<span style="font-family:Consolas,Menlo,monospace;direction:ltr;unicode-bidi:isolate">' + esc_(b.id) + '</span>'],
      ['التاريخ', esc_(arDate_(b.date))],
      ['الوقت', '<span dir="ltr">' + esc_(b.time) + '</span>'],
      ['الحالة', '<span style="background:' + C.redLight + ';color:' + C.red + ';padding:2px 10px;border-radius:4px;font-weight:bold">ملغى</span>']
    ]) +
    p_('يسعدنا حجزك لموعد آخر في أي وقت.') +
    '<div style="margin:6px 0 4px">' + button_('احجز موعدًا آخر', SITE_URL, C.purple) + '</div>';
  return layout_({ preheader: 'تم إلغاء حجزك ' + b.id, title: 'تم إلغاء الحجز',
    subtitle: arDate_(b.date) + ' · ' + b.time, accent: C.dark, body: body });
}

function reminderHtml_(b, s) {
  const body =
    p_('مرحبًا <b>' + esc_(b.name || '') + '</b>،') +
    p_('نذكّرك بجلسة <b>' + ltrSpan_('Coffee with IT') + '</b>' + (b.topic ? ' حول <b>' + keepLatin_(esc_(b.topic)) + '</b>' : '') + ' اليوم الساعة <b dir="ltr">' + esc_(b.time) + '</b>.') +
    detailsCard_([
      ['رقم الحجز', '<span style="font-family:Consolas,Menlo,monospace;direction:ltr;unicode-bidi:isolate">' + esc_(b.id) + '</span>'],
      ['الوقت', timeRange_(b)],
      ['طريقة الحضور', modePill_(b.mode, b.modeLabel)]
    ]) +
    whereBlock_(b);
  return layout_({ preheader: 'جلستك اليوم الساعة ' + b.time, title: 'تذكير بموعد جلستك',
    subtitle: 'اليوم · ' + b.time, accent: C.blue, body: body });
}

function thanksHtml_(b, s) {
  // Outlook for Windows (Word engine) ignores display:block, borders and radius on <a>/<span>, so each choice is a
  // fixed-size table cell carrying the border and background; only the text inside is linked. Order 1 → 5 from the right.
  const nb = t => esc_(t);  // labels may wrap on phones; the fixed cell height keeps all five boxes equal
  const cells = RATE_LABELS.map((l, i) => {
    const n = i + 1, link = esc_(rateLink_(s, b.id, n)), bg = n >= 4 ? C.light : '#ffffff';
    const a = (txt, css) => '<a href="' + link + '" target="_blank" style="text-decoration:none;font-family:' + FONT + ';' + css + '">' + txt + '</a>';
    return '<td width="20%" valign="top" style="padding:0 3px">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + bg + '" style="border:2px solid ' + C.purple + ';border-radius:8px;background:' + bg + '">' +
      '<tr><td align="center" valign="middle" height="92" style="height:92px;padding:6px 2px;text-align:center;line-height:14px">' +
        a(String(n), 'color:' + C.dark + ';font-size:24px;line-height:28px;font-weight:bold') + '<br>' +
        a(nb(l[0]), 'color:' + C.muted + ';font-size:11px;line-height:16px') + '<br>' +
        a(nb(l[1]), 'color:' + C.muted + ';font-size:10px;line-height:14px') +
      '</td></tr></table></td>';
  }).join('');
  const body =
    p_('مرحبًا <b>' + esc_(b.name || '') + '</b>،') +
    p_('شكرًا لحضورك جلسة <b>' + ltrSpan_('Coffee with IT') + '</b>' + (b.topic ? ' حول <b>' + keepLatin_(esc_(b.topic)) + '</b>' : '') + '. يهمنا رأيك لتطوير جلساتنا القادمة، ولن يستغرق التقييم أكثر من دقيقة.') +
    '<div dir="ltr" style="text-align:left;color:' + C.muted + ';font-size:13px;margin:0 0 16px">Thank you for attending. Your feedback helps us improve — it takes less than a minute.</div>' +
    '<div style="border-top:1px solid ' + C.line + ';padding-top:16px;text-align:center">' +
      '<div style="font-weight:bold;font-size:17px;color:' + C.dark + '">' + RATE_Q_AR + '</div>' +
      '<div dir="ltr" style="font-size:13px;color:' + C.muted + ';margin-bottom:12px">' + RATE_Q_EN + '</div>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="direction:rtl;table-layout:fixed"><tr>' + cells + '</tr></table>' +
      '<div style="font-size:13px;color:' + C.muted + ';margin-top:12px">اضغط على رقم للتقييم، ثم يمكنك كتابة مقترحاتك · Tap a number, then add your suggestions</div>' +
    '</div>' +
    detailsCard_([
      ['الجلسة', esc_(arDate_(b.date)) + ' · ' + timeRange_(b)],
      ['طريقة الحضور', esc_(b.modeLabel || '')]
    ]);
  return layout_({ preheader: 'شكرًا لحضورك — ' + RATE_Q_AR, title: 'شكرًا لحضورك',
    subtitle: 'قيّم جلسة Coffee with IT · Rate your session', accent: C.purple, body: body });
}

/* ---------- building blocks ---------- */

function layout_(o) {
  return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc_(o.title) + '</title>' +
    '<link href="' + FONT_CSS_URL + '" rel="stylesheet" type="text/css">' +
    '<style type="text/css">@import url(\'' + FONT_CSS_URL + '\');' +
    'body,table,td,div,p,a,span,b,li{font-family:' + FONT + '}</style></head>' +
    '<body style="margin:0;padding:0;background:' + C.bg + ';font-family:' + FONT + '">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0">' + esc_(o.preheader) + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + C.bg + '"><tr>' +
    '<td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ' + C.line + ';border-radius:6px;border-collapse:separate;overflow:hidden">' +
      // logos (embedded in the message: shown by Outlook without "download pictures")
      '<tr><td bgcolor="#ffffff" style="padding:16px 24px;border-bottom:1px solid ' + C.line + ';background:#ffffff">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt"><tr>' +
          '<td align="right" valign="middle"><img src="cid:sru" alt="جامعة سليمان الراجحي" width="206" height="34" style="display:block;width:206px;height:34px;border:0"></td>' +
          '<td align="left" valign="middle"><img src="cid:ictd" alt="الإدارة التنفيذية للاتصالات وتقنية المعلومات" width="125" height="44" style="display:block;width:125px;height:44px;border:0"></td>' +
        '</tr></table></td></tr>' +
      // hero — every cell carries bgcolor so Outlook for Windows draws no white lines between tables
      '<tr><td bgcolor="' + o.accent + '" align="right" style="background:' + o.accent + ';padding:24px 28px 22px;font-family:' + FONT + ';color:#ffffff;text-align:right">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl" bgcolor="' + o.accent + '" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;background:' + o.accent + '">' +
          '<tr><td bgcolor="' + o.accent + '" align="right" valign="middle" style="background:' + o.accent + '">' +
            '<table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="rtl" align="right" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt"><tr>' +
              '<td bgcolor="' + o.accent + '" valign="middle" style="background:' + o.accent + ';padding-left:12px"><img src="cid:cwit" alt="Coffee with IT — قهوة مع تقنية المعلومات" width="52" height="52" style="display:block;width:52px;height:52px;border:0"></td>' +
              '<td bgcolor="' + o.accent + '" valign="middle" style="background:' + o.accent + '">' +
                '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt"><tr>' +
                  '<td bgcolor="#6c3fa8" dir="ltr" style="background:#6c3fa8;padding:4px 12px;border-radius:4px;font-family:' + FONT + ';font-size:13px;line-height:18px;font-weight:bold;color:#ffffff;white-space:nowrap">Coffee with IT · 10 min</td>' +
                '</tr></table></td>' +
            '</tr></table></td></tr>' +
          '<tr><td bgcolor="' + o.accent + '" align="right" style="background:' + o.accent + ';padding-top:14px;font-family:' + FONT + ';font-size:26px;line-height:36px;font-weight:bold;color:#ffffff">' + esc_(o.title) + '</td></tr>' +
          '<tr><td bgcolor="' + o.accent + '" align="right" style="background:' + o.accent + ';padding-top:2px;font-family:' + FONT + ';font-size:15px;color:#ffffff">' + esc_(o.subtitle) + '</td></tr>' +
        '</table>' +
      '</td></tr>' +
      '<tr><td bgcolor="' + C.blue + '" height="5" style="height:5px;line-height:5px;font-size:0;mso-line-height-rule:exactly;background:' + C.blue + '">&nbsp;</td></tr>' +
      // body
      '<tr><td style="padding:26px 28px 28px;font-family:' + FONT + ';color:' + C.ink + ';font-size:15px;line-height:1.85;text-align:right">' + o.body + '</td></tr>' +
      // footer
      '<tr><td style="background:' + C.light + ';padding:16px 24px;font-family:' + FONT + '">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
          '<td align="right" valign="middle" style="font-size:13px;color:' + C.dark + ';line-height:1.7" dir="ltr">' +
            '<b>For Support:</b> Dial <b style="font-size:18px;color:' + C.purple + '">*</b> or Send email to: ' +
            '<a href="mailto:servicedesk@sr.edu.sa" style="color:' + C.purple + ';font-weight:bold;text-decoration:none">servicedesk@sr.edu.sa</a></td>' +
          '<td align="left" valign="middle" width="110"><a href="https://ictsru.github.io/ITOC/#forms" target="_blank">' +
            '<img src="cid:itoc" alt="ITOC — IT Operations Center" width="93" height="38" style="display:block;width:93px;height:38px;border:0"></a></td>' +
        '</tr></table></td></tr>' +
    '</table>' +
    '<div style="font-family:' + FONT + ';font-size:12px;color:' + C.muted + ';padding:14px 8px 0;line-height:1.7">' +
      'رسالة آلية من نظام حجز Coffee with IT — مركز عمليات تقنية المعلومات (ITOC)<br>' +
      'الإدارة التنفيذية للاتصالات وتقنية المعلومات — جامعة سليمان الراجحي</div>' +
    '</td></tr></table></body></html>';
}

/** Joins consecutive Latin words with non-breaking spaces so "Read AI" never splits across lines in Arabic text. */
function keepLatin_(t) {
  // each run of Latin words ("Read AI", "Microsoft 365") → its own LTR span: correct order and no line break in Outlook and Gmail
  return String(t).replace(/(?<![&#\w])[A-Za-z0-9][\w.\-]*(?: +[A-Za-z0-9][\w.\-]*)*/g, m => ltrSpan_(m));
}

/** Latin text inside Arabic: dir="ltr" for Outlook (Word engine), unicode-bidi for browsers; never wraps. */
function ltrSpan_(t) { return '<span dir="ltr" style="unicode-bidi:embed;white-space:nowrap">' + t + '</span>'; }

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
    ';padding:2px 12px;border-radius:4px">' + esc_(label || '') + '</span>';
}

function whereBlock_(b) {
  if (b.mode === 'zoom') {
    const link = /^https?:\/\//i.test(b.where || '') ? b.where : DEFAULT_ZOOM_LINK;
    const id = zoomMeetingId_(link);
    return '<div style="background:' + C.blueLight + ';border-radius:6px;padding:16px 18px;margin:4px 0 6px">' +
      '<div style="font-weight:bold;color:#08537f;margin-bottom:10px">رابط اجتماع Zoom</div>' +
      button_('انضم إلى الجلسة عبر Zoom', link, C.blue) +
      (id ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px"><tr>' +
        '<td style="font-size:14px;color:' + C.ink + ';padding-left:8px">رقم الاجتماع:</td>' +
        // own cell = own bidi paragraph: the number groups never follow Arabic letters, so they keep their order
        '<td style="font-size:14px;color:' + C.ink + ';font-family:Consolas,Menlo,monospace;font-weight:bold;letter-spacing:0.5px">' + esc_(id) + '</td>' +
      '</tr></table>' : '') +
      '<div style="font-size:12px;color:' + C.muted + ';margin-top:6px;direction:ltr;text-align:left;word-break:break-all">' +
        '<a href="' + esc_(link) + '" style="color:' + C.muted + '">' + esc_(link) + '</a></div>' +
      '</div>';
  }
  return '<div style="background:' + C.light + ';border-radius:6px;padding:16px 18px;margin:4px 0 6px">' +
    '<div style="font-weight:bold;color:' + C.dark + ';margin-bottom:4px">مكان الجلسة</div>' +
    '<div>' + esc_(b.where || '') + '</div></div>';
}

/** Settings › ZoomLink when it is a real link, otherwise DEFAULT_ZOOM_LINK. */
function zoomLink_(s) {
  const v = String((s && s.ZoomLink) || '').trim();
  return /^https?:\/\//i.test(v) ? v : DEFAULT_ZOOM_LINK;
}

/** "81335191824" → "813-3519-1824" (hyphens keep the groups in order inside Arabic text) */
function zoomMeetingId_(link) {
  const m = String(link).match(/\/j\/(\d{9,11})/);
  if (!m) return '';
  const d = m[1];
  return d.length === 11 ? d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7) : d.replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3');
}

/** "من 11:45 إلى 11:55" — Arabic connectors keep the order correct in every mail client. */
function timeRange_(b) {
  return '<span style="white-space:nowrap">من <b>' + esc_(b.time) + '</b> إلى <b>' + esc_(b.endTime) + '</b></span>';
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

// Invitations are organised by the owner of the calendar the event is created on, so bookings go on the ITOC calendar.
// Settings › CalendarId overrides it; "me" uses the deploying account's own calendar.
const DEFAULT_CALENDAR_ID = 'itoc@sr.edu.sa';

function calendarId_(s) {
  const v = String((s && s.CalendarId) || '').trim();
  return (!v || v.toLowerCase() === 'primary') ? DEFAULT_CALENDAR_ID : v;
}

/** The ITOC calendar (subscribing to it once if it is shared but not yet in the list); falls back to the own calendar with a warning. */
function calendar_(s) {
  const id = calendarId_(s);
  if (id.toLowerCase() === 'me') return CalendarApp.getDefaultCalendar();
  let cal = CalendarApp.getCalendarById(id);
  if (!cal) { try { cal = CalendarApp.subscribeToCalendar(id, { hidden: false }); } catch (e) { cal = null; } }
  if (cal) return cal;
  console.warn('Calendar ' + id + ' is not shared with ' + Session.getEffectiveUser().getEmail() +
    ' ("Make changes to events") — invitation created on the own calendar instead.');
  return CalendarApp.getDefaultCalendar();
}

/**
 * Creates the booking event with NO Google Meet and sends the invitation.
 *  1. The event is inserted through the Calendar API (advanced service) with conferenceDataVersion=1 and no
 *     conferenceData — this stops Calendar from auto-attaching Meet — and with no guests, so nothing is sent yet.
 *  2. If Meet was still attached (domain policy), it is stripped (patch to null, then full update without it).
 *  3. Only then is the attendee added with sendUpdates:'all' → the invitation e-mail has no "Join with Google Meet".
 * Returns the iCalUID (works with CalendarApp.getEventById for cancellation).
 * Without the advanced service it falls back to CalendarApp (invitation sent, Meet may appear) and logs a warning.
 */
function createInviteWithoutMeet_(cal, title, start, end, opts, email) {
  if (typeof Calendar === 'undefined') {
    console.warn('Calendar advanced service is NOT enabled — Google Meet cannot be removed. Services (+) → Google Calendar API.');
    return cal.createEvent(title, start, end, Object.assign({ guests: email, sendInvites: true }, opts)).getId();
  }
  const calId = cal.getId(), tz = Session.getScriptTimeZone();
  const ev = Calendar.Events.insert({
    summary: title, location: opts.location || '', description: opts.description || '',
    start: { dateTime: start.toISOString(), timeZone: tz }, end: { dateTime: end.toISOString(), timeZone: tz },
    guestsCanModify: false, guestsCanInviteOthers: false
  }, calId, { conferenceDataVersion: 1, sendUpdates: 'none' });
  stripMeet_(calId, ev.id);
  Calendar.Events.patch({ attendees: [{ email: email }] }, calId, ev.id, { conferenceDataVersion: 1, sendUpdates: 'all' });
  return ev.iCalUID || ev.id;
}

/** Removes any Google Meet conference from an event (two methods); true when none remains. */
function stripMeet_(calId, eventId) {
  const has = () => { const e = Calendar.Events.get(calId, eventId); return !!(e.conferenceData || e.hangoutLink); };
  if (!has()) return true;
  try { Calendar.Events.patch({ conferenceData: null }, calId, eventId, { conferenceDataVersion: 1, sendUpdates: 'none' }); } catch (e) { console.warn(e); }
  if (!has()) return true;
  try {
    const r = Calendar.Events.get(calId, eventId);
    delete r.conferenceData; delete r.hangoutLink;
    Calendar.Events.update(r, calId, eventId, { conferenceDataVersion: 1, sendUpdates: 'none' });
  } catch (e) { console.warn(e); }
  const ok = !has();
  if (!ok) console.warn('Google Meet is still attached — the domain policy adds it. Admin console → Apps → Google Workspace → Calendar → Sharing settings → Video conferencing: turn off automatic Meet.');
  return ok;
}

/**
 * Menu / editor: checks the sender and the calendar and says exactly what is missing.
 * Creates and deletes a 1-minute test event (no guests) to prove write access to the ITOC calendar.
 */
function checkSenderAndCalendar() {
  const s = getSettings_();
  const me = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  const from = mailFrom_(s), id = calendarId_(s), out = [];
  const aliases = GmailApp.getAliases().map(a => String(a).toLowerCase());
  out.push(from === me || aliases.indexOf(from) !== -1
    ? '✔ البريد: الرسائل تُرسل من ' + from
    : '✖ البريد: ' + from + ' ليس عنوان «إرسال بريد باسم» مفعّلًا في ' + me + ' — الرسائل تُرسل من ' + me);
  let cal = CalendarApp.getCalendarById(id);
  if (!cal) { try { cal = CalendarApp.subscribeToCalendar(id, { hidden: false }); } catch (e) { cal = null; } }
  if (!cal) {
    out.push('✖ التقويم: لا يمكن الوصول إلى تقويم ' + id + ' — شاركه من حساب ITOC مع ' + me + ' بصلاحية «Make changes to events». الدعوات تصدر الآن من ' + me);
  } else {
    try {
      const t = new Date(Date.now() + 86400000), ev = cal.createEvent('Coffee with IT — اختبار الصلاحية', t, new Date(t.getTime() + 60000));
      ev.deleteEvent();
      out.push('✔ التقويم: الدعوات تُنشأ على تقويم ' + id + ' (المنظِّم: ' + cal.getName() + ')');
      if (typeof Calendar === 'undefined') {
        out.push('✖ Google Meet: خدمة Google Calendar API غير مفعّلة في المحرر — أضفها من Services (+) ثم انشر نسخة جديدة. حتى ذلك يظهر رابط Meet في الدعوة.');
      } else {
        const t2 = new Date(Date.now() + 2 * 86400000), tz = Session.getScriptTimeZone();
        const e2 = Calendar.Events.insert({ summary: 'Coffee with IT — اختبار Meet', start: { dateTime: t2.toISOString(), timeZone: tz },
          end: { dateTime: new Date(t2.getTime() + 60000).toISOString(), timeZone: tz } }, cal.getId(), { conferenceDataVersion: 1, sendUpdates: 'none' });
        const clean = stripMeet_(cal.getId(), e2.id);
        Calendar.Events.remove(cal.getId(), e2.id, { sendUpdates: 'none' });
        out.push(clean ? '✔ Google Meet: لا يُضاف إلى الدعوات' :
          '✖ Google Meet: سياسة النطاق تفرض إضافته — يلزم إيقافه من Admin console (Calendar › Video conferencing)');
      }
    } catch (e) {
      out.push('✖ التقويم: تقويم ' + id + ' ظاهر لكن الصلاحية «عرض فقط» — غيّرها إلى «Make changes to events». الدعوات تصدر الآن من ' + me);
    }
  }
  const msg = out.join('\n');
  console.log(msg);
  safeAlert_(msg);
  return msg;
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

/** Unicode NFC, invisible marks removed, any run of spaces (incl. non-breaking) → one space, trimmed. */
function norm_(v) {
  return String(v == null ? '' : v).normalize('NFC').replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .replace(/[\s\u00A0]+/g, ' ').trim();
}
/** Matching key for topics: normalised and lower-case. */
function topicKey_(v) { return norm_(v).toLowerCase(); }

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

/* ───────────────────────── E-mail images (embedded) ─────────────────────────
   Logos are sent inside the message (cid:) instead of linked from GitHub, so Outlook shows them without
   "Click here to download pictures" and nothing depends on the website being reachable. ~15 KB per e-mail. */
const MAIL_IMG = {
  sru: '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',
  ictd: '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',
  cwit: 'iVBORw0KGgoAAAANSUhEUgAAAGgAAABoCAMAAAAqwkWTAAABIFBMVEVXXaHwblFvnNKWuN0gCgU9ZadAJx9KfcKqoJ6/wNvrLgLAr8z+/v4AAABPmNfq6e5IGG6Ih4dTJnb///9sp9vV5vXMxs7O2Ouqp6cyGhQ6ic9DLCWYl5aKuuTtSSVKNC5BjdGoy+q21O47IxzZ19eZwudsRora2tr19fW2tLS5qcfGt9FcM32Vha94VpSUeqvsQh3t7e1coNuEZpx3Z2OFd3NjO4Oqqqq4uLja2trj2+jo6Oipk7vrPRc9JyLw2tWHaqFcSUV9fX3t7e3w8PBnVFD4xLpXQj2hirSlnJkrfcePgH3uUzH2pZP4vLB/f39xrOB5s+KAXprYzuHziHHi4uI7CmVbNICxnMHwdVn1mob6zcP1495zYl9wYJeYpNCVLdP9AAAAYHRSTlP////////////////+AP//////Av////////////////////////811///////////j///////Aw5J/3T/////////srD/////////////DP//////W/////////////+0kDX6AAAHI0lEQVR42r2aCXeiOhSA6cy8PRKhkCBKRQVaBZfW6rR2s/s27UyX2bf//y/eTYJWWzdo8Z6e07iQz5u7BiKlHmRxMZV6v7l1uIKeKSuHW5vvxXx9kYYwy6vPhvRhq8tDqD7oLWCO0IvK0TKfdhi0mNpYRS8uqxupxWHQYmp5BSUgK8s9khRyPqKE5GNIkgRnCyUmW4Ikcc4mSlA2OUni9kGJCreTBL6+sZIsaGUD4kkCT19FCcsqQKS3SS+cWLy30mLqKHnQUWpRiqcQdqOqJMW0kK7p0awkxXU5V9YjOZ4UO1blSKRNKXbysWQtSiKSDuOCXFkuzP7tQyl2VijK8loEI0mxY6Mgr8l09q/HB7kAgmjCiYM+AMhCaO8+YZAug7D88HUhWZDFQEUYXP17nySoyDgyG101GifJgfjCMRMh9G2nsZAYSF/jIO5xX3eW3uGEQJRjuIUQXgLZSwbkCo5IQFc7APqRBEjXBjn43dJSMjYqCMxamH0WQKGdby8Pwjdyz990Gi5cYxZfiAiiwts0YLjMt68bYKDG9xcP2GLfOmAoeH3COdcvnoKK/Sgt8BhinJ2lE/TSIL0fPJZpUrFuOwt76MVBH5iz6ZxjQ7vwvTGjv0UFcYUYp2iy/yyAlq5RAqCCqKisz2L9z/3OTJknBsgNmxFIdLbFFNo5Qc8GuW5xVEq46fmeCx7XuEfPBunyiOZQD+sP5S4OoO8JgaB436C+jX4sLeHng1ChUBzxLs8GIq1S9LWBXgDE0ifIk0iyen2JhvYi+dx4EFVV1XuahPQeyUXXV88BFTSN9kDp9qSiVETPspFrm8I6ND0Ewo6zNzgx1XhngnVdjweCNBaCgvZnsXR7xuV6Syk7jxRYgyzharJpmrasuRRHBGFK0Rev9gv3uve/j7N5hbBPSPlcUS4vLxUld26UMbLCUGC0C1PWipGdof4prXIKZM7jUmkfxsZ6fjczJFkH3v2pGAQL09qQ0fWooDQHFaGStjL5LIDw/ps3MPnu7m52N8sln1lHOJ8pZXbzxy0D85JryzgaaDvwPMwciyIlk89n8zkHOUZrXyhVKnHSruEcl/LwabZUKuV/Ep4wCnEC1uLXtdi8f2ZP13NGuWzkWuvH+6d5BjpuZUtswFmZjMLyhg0XkLOa591u4+mgXkIoiBxKWqfsN7OFg0lP909P80JKjJDdLWVK+X1ljwWGbNNOLS0k8KeCDEXBYTUIEys5bx2zJer5Qakv2fz+ulJm/XCRta+23vykCkmnyTRQLgTR3m4hDFhinCut1rqQVutSOTdIGMNFS7ZtXug9oQ8j1aZqlMuBm8EfVO6p9xH0ovuKxazJOWtYVes+8W8ZSaUzOANoZbDSreGxgIKlwWoJhKZZxQKY6IbUxAVNIKX9WUG8GkyIQYwHKwm0RqbVCV/6M4MODs7ZxdDJuQNK4QnYgsm9O3Sf9IxLR0jZQTogqLUma1ahyMaI2hfjbzNZ5sDdrgqkfm/mdksXaVIX1gC5eI3NsTpp4R6dSw1A27P3dXQgI7PC81rW5Al372yrN2YmCnCUBtKy/3r1+5/+YrvjfYOCL/R+FQ5AoUqETpUAgf6WJOkP6Vd32n0U82HlPOB0o7TE2PsSFsPXlVpt2n1P0xowkBet9+54QbWXsqR6OKgG9dErp4fXMA6O2uRXakHgdZkD4c/darVarzdHrT/SbFt4vq/C5zUcdTfhsFbhS11lOtD6eJAO0UpFcYaUUI++bSFQW5k26sDUZ171qUJ8C4goW7a2H2d/lFNyrCHwg4ndFBVZoQJVSK3iWBsxR1EOykyN2qCGTy3EXI71NF0ad8cH9ZbXwWa1UiHl8MXjXZtpvwKv/qQ2756xtYSKwVTCVaVqwPjgqUq6bdsYB2qVxt3D0juxeIrzoF95RKyaJsXN7Wk98VjQdtfn15LB9Roxm2aa4cYCxwH5QdDp+Tg02+Pn0C76t/OdshMZtJ0eqMRO7mAsSbsYyOjkwIgI6jwq+eBuZGRttO3CkItOIEmjFVLTt0OJ3FAMPKJrtga+UganVHLRQJWnKQuXjUcm0AsP2mDCAm7QQWcD4TYj1eiwL43Ypoc9bE5QRmn9ABr5oIqojKTWGcohIA4eRSDlPgNWbaLTrYx59HbX5g20elvB3HGhUQYxDLZ5AYExm/ugDzGIMzleD8c+TKyqHJUOmpVOaAemwIMGMD1jl8k0Bpet8Y9HO9VA7AvSaru57XfGdsPsu4RMAW1OeuCLK90g3IQwWq15VvHJ0EYfU1I56zab22RKqlvZmPIIG/vVWqCmHwSoQbvteV67LbT1gDJ95VZTMzyUxxR+dc0LhGZ94mcPihSZ8T7Ncmr2Ywa4Q4nvVyqV/3yf3HUi3QlixwzmdnBibkdB5ne4ZW7HdeZ3AGl+R6rmd0hsfsfe5neQb35HE+d32DLp46P/A9SXjs/TFGzzAAAAAElFTkSuQmCC',
  itoc: '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'
};

/** Blobs for every cid:key used in the HTML. */
function mailImages_(html) {
  const out = {};
  Object.keys(MAIL_IMG).forEach(function (k) {
    if (String(html || '').indexOf('cid:' + k) !== -1)
      out[k] = Utilities.newBlob(Utilities.base64Decode(MAIL_IMG[k]), 'image/png', k + '.png');
  });
  return out;
}
