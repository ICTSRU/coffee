/* Coffee with IT · language + theme · v1.0 (app v3.6)
   - Language: saved choice › ?lang= in the URL › browser language. Theme: saved choice › device setting (follows it live).
   - The page markup stays Arabic; this layer translates text nodes and attributes (placeholder, title, aria-label, alt)
     with the EN dictionary and the patterns below, including content rendered later (MutationObserver).
   - Mark any element with data-noi18n to leave it untouched. */
(function () {
  'use strict';
  var KL = 'cwit.lang', KT = 'cwit.theme';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function qp(name) { var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search); return m ? decodeURIComponent(m[1]) : ''; }
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function sysTheme() { return mq && mq.matches ? 'dark' : 'light'; }
  var urlLang = qp('lang'), urlTheme = qp('theme');
  if (urlLang === 'ar' || urlLang === 'en') put(KL, urlLang);
  if (urlTheme === 'dark' || urlTheme === 'light') put(KT, urlTheme);
  var lang = get(KL), theme = get(KT);
  var CWI = window.CWI = {
    lang: (lang === 'ar' || lang === 'en') ? lang : (/^ar/i.test((navigator.languages && navigator.languages[0]) || navigator.language || 'ar') ? 'ar' : 'en'),
    langSet: lang === 'ar' || lang === 'en',
    theme: (theme === 'dark' || theme === 'light') ? theme : sysTheme(),
    themeSet: theme === 'dark' || theme === 'light',
    listeners: [],
    onChange: function (fn) { CWI.listeners.push(fn); }
  };
  function applyRoot() {
    var h = document.documentElement;
    h.setAttribute('lang', CWI.lang); h.setAttribute('dir', CWI.lang === 'ar' ? 'rtl' : 'ltr'); h.setAttribute('data-theme', CWI.theme);
  }
  applyRoot();
  if (mq) (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () {
    if (!CWI.themeSet) { CWI.theme = sysTheme(); applyRoot(); syncButtons(); fire('theme'); }
  });

  /* ---------- translation ---------- */
  var EN = /*EN_DICT*/{};
  var AR = /[\u0600-\u06FF]/;
  var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var D = DAYS.join('|'), M = MONTHS.join('|');
  function loc(s) { return String(s).replace(/مبنى\s*(\S+)\s*—\s*مكتب\s*(\S+)/g, 'Building $1 — Office $2'); }
  function dates(s) {
    return String(s)
      .replace(new RegExp('(' + D + ') (\\d{1,2}) (' + M + ')(?: (\\d{4}))?', 'g'), function (m, d, n, mo, y) { return EN[d] + ', ' + n + ' ' + EN[mo] + (y ? ' ' + y : ''); })
      .replace(new RegExp('(\\d{1,2}) (' + M + ')', 'g'), function (m, n, mo) { return n + ' ' + EN[mo]; });
  }
  function soft(s) { return toEn(s); }
  // [pattern, replacement(match) → string]; groups are translated recursively with tr()
  var PAT = [
    [/^من (\d\d:\d\d) إلى (\d\d:\d\d)$/, function (m) { return 'From ' + m[1] + ' to ' + m[2]; }],
    [/^(.+) · من (\d\d:\d\d) إلى (\d\d:\d\d)$/, function (m) { return dates(m[1]) + ' · ' + m[2] + '–' + m[3]; }],
    [/^المواعيد المتاحة يوم (.+) \(مدة الجلسة (\d+) دقائق\)$/, function (m) { return 'Available times on ' + dates(m[1]) + ' (' + m[2] + '-minute session)'; }],
    [/^(.+) — مكتمل$/, function (m) { return dates(m[1]) + ' — full'; }],
    [/^(\d\d:\d\d) محجوز$/, function (m) { return m[1] + ' booked'; }],
    [/^(.+) \(مبنى (.+) — مكتب (.*)\)$/, function (m) { return soft(m[1]) + ' (Building ' + m[2] + ' — Office ' + m[3] + ')'; }],
    [/^مبنى (.+) — مكتب (.+)$/, function (m) { return 'Building ' + m[1] + ' — Office ' + m[2]; }],
    [/^(.+?) · (مبنى .+)$/, function (m) { return soft(m[1]) + ' · ' + loc(m[2]); }],
    [/^(\d\d:\d\d) · (.+)$/, function (m) { return m[1] + ' · ' + soft(m[2]); }],
    [/^إلغاء حجز (.+?) \((.+)\)؟ سيُرسل إليه بريد بالإلغاء\.$/, function (m) { return 'Cancel the booking of ' + m[1] + ' (' + dates(m[2]) + ')? A cancellation e-mail will be sent.'; }],
    [/^إلغاء حجز (.+)$/, function (m) { return 'Cancel booking — ' + dates(m[1]); }],
    [/^(\d+) موظفًا$/, function (m) { return m[1] + ' staff'; }],
    [/^المتاح: (\d+) موعدًا$/, function (m) { return 'Available: ' + m[1] + ' slots'; }],
    [/^(\d+) منها في مكتب الموظف$/, function (m) { return m[1] + ' at the employee\'s office'; }],
    [/^(\d+) حضر · (\d+) لم يحضر$/, function (m) { return m[1] + ' attended · ' + m[2] + ' no-show'; }],
    [/^(\d+) جلسة مقدّمة$/, function (m) { return m[1] + ' sessions delivered'; }],
    [/^(\d+)% من الإجمالي$/, function (m) { return m[1] + '% of total'; }],
    [/^من (\d+) اسمًا مفعّلًا$/, function (m) { return 'of ' + m[1] + ' active names'; }],
    [/^(\d+) بمدة مسجّلة$/, function (m) { return m[1] + ' with duration'; }],
    [/^المخطط: (\d+) د$/, function (m) { return 'Planned: ' + m[1] + ' min'; }],
    [/^([\d,]+) د$/, function (m) { return m[1] + ' min'; }],
    [/^([\d,]+) دقيقة$/, function (m) { return m[1] + ' minutes'; }],
    [/^(\d+) بتعليق$/, function (m) { return m[1] + ' with comment'; }],
    [/^من (\d+) رسالة تقييم$/, function (m) { return 'of ' + m[1] + ' rating e-mails'; }],
    [/^(\d+) جلسة$/, function (m) { return m[1] + ' sessions'; }],
    [/^(\d+) حجز$/, function (m) { return m[1] + ' bookings'; }],
    [/^(\d) · (.+)$/, function (m) { return m[1] + ' · ' + soft(m[2]); }],
    [/^(.+): (\d+) \((\d+)%\)$/, function (m) { return soft(m[1]) + ': ' + m[2] + ' (' + m[3] + '%)'; }],
    [/^(.*) · تحويلة$/, function (m) { return soft(m[1]) + ' · Ext.'; }],
    [/^(حضر|لم يحضر) — (.+)$/, function (m) { return EN[m[1]] + ' — ' + m[2]; }],
    [/^أُرسلت في (.+)$/, function (m) { return 'Sent on ' + m[1]; }],
    [/^إرسال الشكر والتقييم إلى (.+)$/, function (m) { return 'Send thank-you & rating to ' + m[1]; }],
    [/^تفاصيل جلسة (.+)$/, function (m) { return 'Session details — ' + m[1]; }],
    [/^حذف صلاحية (.+) نهائيًا من القائمة؟$/, function (m) { return 'Permanently remove ' + m[1] + ' from the access list?'; }],
    [/^حذف صلاحية (.+)$/, function (m) { return 'Remove access — ' + m[1]; }],
    [/^(.+) \(موقوف\)$/, function (m) { return m[1] + ' (inactive)'; }],
    [/^الفترة: (.+?) · عدد السجلات: (\d+)(?: · الموضوع: (.+))?$/, function (m) { return 'Period: ' + soft(m[1]) + ' · Records: ' + m[2] + (m[3] ? ' · Topic: ' + soft(m[3]) : ''); }],
    [/^أُعدّ بواسطة (.+)$/, function (m) { return 'Prepared by ' + m[1]; }],
    [/^من (.+) إلى (.+)$/, function (m) { return 'From ' + dates(m[1]) + ' to ' + dates(m[2]); }],
    [/^من (.+)$/, function (m) { return 'From ' + dates(m[1]); }],
    [/^إلى (.+)$/, function (m) { return 'To ' + dates(m[1]); }],
    [/^تم إرسال (\d+) رسالة شكر وتقييم\.$/, function (m) { return m[1] + ' thank-you & rating e-mails sent.'; }],
    [/^أُرسلت نسخة تجريبية إلى (\S+)(?: من (\S+))?\.$/, function (m) { return 'Test copy sent to ' + m[1] + (m[2] ? ' from ' + m[2] : '') + '.'; }],
    [/^تمت إضافة «(.+)» إلى قائمة مقدمي الجلسات\.$/, function (m) { return '“' + m[1] + '” added to the presenter list.'; }],
    [/^تم منح صلاحية الدخول إلى (.+)\.$/, function (m) { return 'Access granted to ' + m[1] + '.'; }],
    [/^تم حفظ تفاصيل جلسة (.+)\.$/, function (m) { return 'Session details saved for ' + m[1] + '.'; }],
    [/^تم إرسال رسالة الشكر والتقييم إلى (.+)\.$/, function (m) { return 'Thank-you & rating e-mail sent to ' + m[1] + '.'; }],
    [/^(إرسال|إعادة إرسال) رسالة الشكر والتقييم إلى (.+)؟$/, function (m) { return (m[1] === 'إرسال' ? 'Send' : 'Resend') + ' the thank-you & rating e-mail to ' + m[2] + '?'; }],
    [/^منح (.+) صلاحية الدخول على لوحة الإدارة \(عرض كل الحجوزات وتعديلها\)؟$/, function (m) { return 'Give ' + m[1] + ' access to the admin dashboard (view and edit all bookings)?'; }],
    [/^إدارة صلاحيات الدخول متاحة لمالك النظام فقط \((.+)\)\.$/, function (m) { return 'Only the system owner can manage access (' + m[1] + ').'; }],
    [/^تعذّر الإرسال: (.+)$/, function (m) { return 'Could not send: ' + soft(m[1]); }],
    [/^(.+) \((\d+)\)$/, function (m) { return soft(m[1]) + ' (' + m[2] + ')'; }],
    [/^(.+): ([\d.,]+(?:\/5)?)$/, function (m) { return soft(m[1]) + ': ' + m[2]; }],
    [/^· (.+)$/, function (m) { return '· ' + soft(m[1]); }]
  ];
  function tr(s) { return CWI.lang === 'en' ? toEn(s) : s; }
  /* always English — also used to recognise text this layer already translated */
  function toEn(s) {
    if (s == null) return s;
    s = String(s);
    var k = s.trim();
    if (!k || !AR.test(k)) return s;
    var v = EN[k];
    if (v == null) for (var i = 0; i < PAT.length && v == null; i++) { var m = k.match(PAT[i][0]); if (m) v = PAT[i][1](m); }
    if (v == null) { var d = loc(dates(k)); if (d !== k) v = d; }
    if (v == null) return s;
    var a = s.indexOf(k);
    return s.slice(0, a) + v + s.slice(a + k.length);
  }
  CWI.t = tr;
  CWI.pick = function (ar, en) { return CWI.lang === 'en' ? en : ar; };

  var origText = new WeakMap(), origAttr = new WeakMap();
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  function skipped(el) { return el && el.closest && el.closest('script,style,[data-noi18n]'); }
  function doText(n) {
    var cur = n.nodeValue, o = origText.get(n);
    if (o === undefined || (cur !== o && cur !== toEn(o))) { o = cur; origText.set(n, o); }
    var want = CWI.lang === 'en' ? tr(o) : o;
    if (cur !== want) n.nodeValue = want;
  }
  function doAttrs(el) {
    var map = origAttr.get(el);
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i]; if (!el.hasAttribute(a)) continue;
      var cur = el.getAttribute(a);
      if (!map) { map = {}; origAttr.set(el, map); }
      var o = map[a];
      if (o === undefined || (cur !== o && cur !== toEn(o))) { o = cur; map[a] = o; }
      var want = CWI.lang === 'en' ? tr(o) : o;
      if (cur !== want) el.setAttribute(a, want);
    }
  }
  function walk(node) {
    if (node.nodeType === 3) { var pn = node.parentNode; if (pn && !skipped(pn) && pn.nodeName !== 'TEXTAREA') doText(node); return; }
    if (node.nodeType !== 1 || skipped(node)) return;
    doAttrs(node);
    if (node.nodeName === 'TEXTAREA') return;   // placeholder only — never what the user typed
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }
  var titleAr = null;
  function translateAll() {
    if (titleAr === null) titleAr = document.title;
    document.title = CWI.lang === 'en' ? toEn(titleAr) : titleAr;
    if (document.body) walk(document.body);
  }
  var obs = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === 'childList') for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      else if (m.type === 'characterData') { var pn = m.target.parentNode; if (pn && !skipped(pn) && pn.nodeName !== 'TEXTAREA') doText(m.target); }
      else if (m.type === 'attributes' && !skipped(m.target)) doAttrs(m.target);
    }
  });

  /* ---------- buttons (inserted in the white brand bar) ---------- */
  var ICON_MOON = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  var ICON_SUN = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
  var bLang, bTheme;
  function syncButtons() {
    if (!bLang) return;
    bLang.textContent = CWI.lang === 'ar' ? 'English' : 'عربي';
    bLang.setAttribute('lang', CWI.lang === 'ar' ? 'en' : 'ar');
    bLang.setAttribute('aria-label', CWI.lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
    var dark = CWI.theme === 'dark';
    bTheme.innerHTML = dark ? ICON_SUN : ICON_MOON;
    bTheme.setAttribute('aria-label', CWI.lang === 'en' ? (dark ? 'Light mode' : 'Dark mode') : (dark ? 'الوضع الفاتح' : 'الوضع الداكن'));
    bTheme.setAttribute('title', bTheme.getAttribute('aria-label'));
    bTheme.setAttribute('aria-pressed', String(dark));
  }
  function fire(what) { CWI.listeners.forEach(function (fn) { try { fn(what); } catch (e) { console.warn(e); } }); }
  CWI.setLang = function (l) {
    CWI.lang = l === 'en' ? 'en' : 'ar'; CWI.langSet = true; put(KL, CWI.lang);
    applyRoot(); translateAll(); syncButtons(); fire('lang');
  };
  CWI.setTheme = function (t) {
    CWI.theme = t === 'dark' ? 'dark' : 'light'; CWI.themeSet = true; put(KT, CWI.theme);
    applyRoot(); syncButtons(); fire('theme');
  };
  function mountButtons() {
    var host = document.querySelector('.brand .in');
    if (!host) return;
    var box = document.createElement('div');
    box.className = 'cwi-prefs'; box.setAttribute('data-noi18n', '');
    bLang = document.createElement('button'); bLang.type = 'button'; bLang.className = 'cwi-p cwi-lang';
    bTheme = document.createElement('button'); bTheme.type = 'button'; bTheme.className = 'cwi-p cwi-theme';
    bLang.addEventListener('click', function () { CWI.setLang(CWI.lang === 'ar' ? 'en' : 'ar'); });
    bTheme.addEventListener('click', function () { CWI.setTheme(CWI.theme === 'dark' ? 'light' : 'dark'); });
    box.appendChild(bLang); box.appendChild(bTheme);
    host.insertBefore(box, host.children[1] || null);
    syncButtons();
  }
  function start() {
    mountButtons();
    translateAll();
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
