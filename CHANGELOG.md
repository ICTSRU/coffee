# Changelog — Coffee with IT

## v3.8 — 2026-10-22
- **E-mail to the presenter after each session** — once a session ends, its presenter receives (from itoc@sr.edu.sa) «سجّل تفاصيل جلستك»:
  employee and department, topic, date and time, attendance mode and office location, booking number, the employee's notes,
  and a button that opens «جلساتي». Sent once per session (new Bookings column `PresenterMailAt`).
  Not sent when: no presenter is assigned, the session is marked «لم يحضر», the duration is already recorded,
  the presenter has no e-mail in the Presenters sheet, or the session ended more than 7 days ago.
  Runs with the hourly automation (so it arrives within an hour of the session ending); a presenter assigned later is e-mailed on the next run.
  New setting `PresenterMail` (TRUE/FALSE). Admin dashboard: status label, «إرسال بريد المقدم التجريبي إليّ», and «✉ أُبلغ المقدم» in the bookings log.
- **Arabic is the default on every visit.** The page no longer follows the browser language or remembers English between visits.
  «English» (or a link with `?lang=en`, as in English e-mails) switches it for the current browser session only. The old saved
  language from v3.6–3.7 is cleared automatically. Theme (light/dark) still follows the device and remembers the user's choice.

## v3.7 — 2026-10-22
- **New page «جلساتي» (My sessions) for presenters** — `…/exec?page=my`, new file `apps-script/My.html`.
  - Any account listed and active in the Presenters sheet **with its e-mail** lands on «جلساتي» when it opens the app;
    the booking page stays one click away (`?page=book`). Others are not affected.
  - Shows only the sessions assigned to that presenter: date and time, topic, employee (name, e-mail, department, extension),
    attendance mode and location, booking number, the employee's notes, and the employee's rating and comment.
  - Indicators: sessions delivered, total minutes (and average per session), my average rating, sessions awaiting a duration.
  - Filters: all / awaiting details / upcoming / past, plus search.
  - The presenter records the **actual duration** (allowed once the session has started) and **session notes** (any time).
    Who the presenter is stays an admin decision; a presenter can edit only their own sessions.
  - Arabic / English and light / dark, like every other page.
- **Shows up in the admin dashboard automatically** — saves go to the same Bookings columns the dashboard reads
  (`AdminNotes`, `DurationMin`). New columns `DetailsBy`, `DetailsAt` record who saved and when; the bookings log shows
  «✓ سجّلها المقدم» or the admin's name. The dashboard refreshes quietly every 2 minutes and when its tab comes back into view
  (not while the details dialog is open or a field is being edited).
- Links: «جلساتي» on the booking page and in the admin header for presenters.

## v3.6 — 2026-10-22
- **English version of every page** — booking, rating, admin dashboard and the GitHub sign-in page.
  - «English / عربي» button in the white logo bar; the page switches instantly (no reload), including direction (LTR/RTL),
    dates («Sunday, 25 October»), messages from the server, confirmation dialogs, the printed report and the CSV headers.
  - First visit follows the browser language; the choice is remembered. The sign-in page passes the language (and theme) to the app (`?lang=en&theme=dark`).
  - Logos keep the letterhead layout in both languages (university right, ICTD left, ITOC bottom-left).
  - User data (names, departments, comments) is shown as entered.
- **Dark mode on every page** — moon/sun button next to the language button. First visit follows the device setting and keeps
  following it until the user picks one. Brand colours stay; cards, fields, pills and charts use dark tokens. Printing always uses the light colours.
- **E-mails in the language the person booked in** — confirmation, cancellation, reminder and thank-you + rating (subject, body,
  dates, attendance mode, office location, footer). New Bookings column `Lang` (`ar` / `en`). Calendar-invitation text follows it too.
  «إرسال نسخة تجريبية إليّ» sends the test in the dashboard's current language.
- **English names for topics** — new Topics column `TopicEn` (added automatically). Set it when adding a topic, or with «✎ الاسم الإنجليزي»
  in the topics list. Used on the English booking page, the rating page and English e-mails; the Arabic name stays the stored value.
- Optional setting **`OnsiteLocationEn`** — English text for the IT office location (falls back to `OnsiteLocation`).
- Source of the language/theme layer: `i18n/` (`runtime.js`, `theme.css`, `en.py` dictionary, `build.py` injects them into the pages).

## v3.5 — 2026-10-22
- **Tech background now comes from the shared SRU Brand Kit** (`https://ictsru.github.io/brand/css/sru-tech-bg.css`) instead of a copy inside
  each page: header bands carry the class `sru-tech-bg`, footers `sru-tech-bg-dark`. One update to the kit restyles this platform and every other one.
- If the kit cannot be reached, the pages fall back to their original solid purple — nothing breaks.
- `assets/sru-tech-bg.css` removed from this repository (it now lives in ICTSRU/brand).

## v3.4 — 2026-10-22
- **New tech background (approved option C «شبكة متصلة متحركة»)** on the purple header band and the footer of every page
  (booking, rating, admin dashboard, GitHub sign-in page): network nodes and lines drifting slowly over a purple → blue gradient.
  Motion stops for users with "reduce motion"; the pattern is removed in the printed admin report.
- **Smaller logos**: SRU and ICTD logos in the white bar 40 px (was 56/52/50 px); Coffee with IT mark 60 px on the booking and rating pages
  (was 76 px), 50 px on the admin dashboard (was 58 px), 56 px on the sign-in page (was 64 px).
- **New reusable file `assets/sru-tech-bg.css`** — the same pattern as a standalone stylesheet for any ICTD/ITOC project
  (classes `sru-tech-bg` for header bands, `sru-tech-bg-dark` for footers).
- Sign-in page version label corrected (showed v1.9).

## v3.3 — 2026-10-22
- **New attendance mode «في مكتبك»** (حضوري — يزورك فريق تقنية المعلومات في مكتبك), next to «حضوري» and «عن بُعد عبر Zoom».
  Choosing it opens two required fields: **رقم المبنى** and **رقم المكتب**. The location («مبنى 1 — مكتب 2122») is saved in the new
  Bookings column `Location`, used as the calendar-invitation location, and shown in the confirmation and reminder e-mails («مكان الجلسة — في مكتبك»)
  with its own checklist. Stored mode label: «حضوري — في مكتبك».
- **Session topic**: larger font in the drop-down (17 px, bold), and a new last option **«✎ موضوع آخر أو سؤال تود مناقشته…»**
  that opens a required text box (up to 200 characters). The typed text becomes the booking topic; new column `TopicOther` = TRUE marks it.
  The optional notes field is renamed «ملاحظات إضافية (اختياري)» to avoid repeating the same question.
- **Admin dashboard**: mode filter and attendance-mode chart now have three parts (مقر تقنية المعلومات / مكتب الموظف / Zoom); the bookings log shows
  «في المكتب» with the building and office number; typed topics carry a «موضوع مقترح» badge, are grouped as «موضوع آخر (مقترح من الموظف)»
  in the topic chart and filter; CSV adds «نوع الموضوع» and «مكان الجلسة (المكتب)».

## v3.2 — 2026-10-22
- **Minutes instead of hours** in the admin dashboard: top KPI «إجمالي دقائق الجلسات», presenters KPI «إجمالي الدقائق»,
  per-presenter table column «إجمالي الدقائق» (the hours and h/min columns were removed) and the bar chart «إجمالي الدقائق لكل مقدم».
- **Bookings log reformatted to fit the page without horizontal scrolling** (17 columns → 9 grouped columns, fixed layout):
  الموعد (date, time, booking no.) · الموظف (name, e-mail, department · extension) · الموضوع (up to 3 lines, full text on hover) ·
  الحالة (mode + status) · الحضور الفعلي · مقدم الجلسة / المدة · الملاحظات (session notes + employee notes, labelled) · التقييم · إجراء.

## v3.1 — 2026-10-22
- **Session details in the bookings log (admin).** New «✎ تسجيل التفاصيل» action on every confirmed booking opens a dialog with:
  - **مقدم الجلسة** — chosen from a drop-down (Presenters list only),
  - **الوقت المستغرق** — actual duration in minutes (1–240, quick buttons 10/5/15/20/30),
  - **ملاحظات الجلسة** — admin notes (up to 500 characters).
  Saved in the new Bookings columns `Presenter`, `AdminNotes`, `DurationMin`. The table shows three new columns; the attendee's own notes column is renamed «ملاحظات الموظف».
- **Presenters dashboard** (follows all filters): number of presenters, sessions delivered, total hours, average duration, and a per-presenter table
  (sessions, total time, total hours, average duration, average rating) with a totals row and an hours bar chart. Sessions marked «لم يحضر» are not counted.
  New KPI «إجمالي ساعات الجلسات» in the top row; new filter «مقدم الجلسة» (including «غير محدد»).
- **Presenter list management**: new sheet `Presenters`, pre-filled from the ITOC Team Directory v1.0; add from a team drop-down or type an outside name; enable / disable.
- **Admin access management from the dashboard**: new sheet `Admins`. The owner (m.elmahdy@sr.edu.sa) grants access by picking a team member
  (drop-down) or typing an @sr.edu.sa address, and can suspend, restore or remove it. Other admins see the list read-only. The owner can never be removed.
  Addresses already in Settings › AdminEmails are carried over automatically (the setting still works; a suspended address stays blocked).
- CSV export and the printed report include presenter, duration and session notes.

## v3.0 — 2026-10-20
- **Outlook for Windows: logos now appear without "Click here to download pictures".** The SRU, ICTD, Coffee with IT and ITOC
  logos are embedded in every e-mail (inline `cid:` images, about 15 KB) instead of being linked from GitHub; Gmail shows them too.
- **No more white vertical lines in the purple header in Outlook**: the header is one full-width table and every cell carries a
  `bgcolor` attribute (Outlook ignores CSS backgrounds on nested tables); the "Coffee with IT · 10 min" label is a table cell, not an inline-block.
- **"Coffee with IT" no longer reversed to "IT with Coffee" in Outlook**: Latin names (Coffee with IT, Read AI, …) are wrapped in
  `dir="ltr"` spans inside Arabic text.
- Time reads «من 10:30 إلى 10:40» with normal spaces (Outlook dropped the space before the second time).
- Reminder e-mail: Latin words in the topic get the same treatment.

## v2.9 — 2026-10-20
- **New Coffee with IT logo everywhere** (cup with digital steam and circuit lines, «Coffee with IT · قهوة مع تقنية المعلومات»).
  - Pages: booking page, rating page, admin dashboard and the GitHub landing page show the new cup on a white rounded tile
    (embedded in the page, so it appears even before GitHub assets are updated).
  - E-mails (confirmation, cancellation, reminder, thank-you + rating): hero uses `assets/cwit-badge.png` (52 px).
    A new file name is used so Gmail's image cache cannot show the old logo.
  - Browser tab / home-screen icon: `assets/cwit-favicon.png`.
  - Awareness posters (Arabic + English, PNG + PDF): the old logo in the "Book a session" box was replaced.
- Assets regenerated from the supplied artwork with a transparent background: `cwit-logo`, `cwit-logo-white`, `cwit-mark`,
  `cwit-icon`, `cwit-mark-white` (kept for older e-mails). The old SVG versions of the previous logo were removed.

## v2.8 — 2026-10-20
- **Google Meet no longer attached to invitations (reworked).** Events are now inserted directly through the Calendar API with
  `conferenceDataVersion=1` and no conference, which stops Calendar from auto-adding Meet; any Meet still attached is stripped
  (two methods) before the attendee is added and the invitation is sent.
- The menu check «فحص المُرسِل والتقويم (ITOC)» now also reports whether the Calendar API service is enabled and whether Meet
  is still forced by the domain policy (test event created and removed).

## v2.7 — 2026-10-20
- **Side booking summary removed.** The page is now a single centred column (max 820 px); the summary and the «تأكيد الحجز»
  button appear once, as step 5 after «بياناتك».
- **«حجوزاتي القائمة»** moved from the side panel to a card above step 1, shown only when the user has an active booking (with the cancel button).

## v2.6 — 2026-10-20
- **Fixed «يرجى اختيار موضوع الجلسة من القائمة» after a topic was selected.** The server compared the trimmed topic with the
  untrimmed Topics sheet value, so a trailing/double space or invisible character rejected a valid choice. Topics are now
  normalised (spaces, non-breaking spaces, invisible marks, Unicode form) on both sides; adding/toggling topics uses the same rule.
- **Booking summary added at the end of the page** (step 5, after «بياناتك»): topic, date, time, attendance mode, name and
  department, with its own «تأكيد الحجز» button and a hint until the required fields are complete. It stays in sync with the side summary.

## v2.5 — 2026-10-20
- **Google Meet removed from calendar invitations.** The event is created without guests, Google Meet (conferenceData) is stripped
  through the Calendar advanced service, then the attendee is added and the invitation is sent — the e-mail no longer shows
  "Join with Google Meet", meeting link or dial-in numbers. The Zoom link stays in the location and description.
- `appsscript.json` enables the **Google Calendar API v3** advanced service (identifier `Calendar`).
- Fallback: if the advanced service is not enabled, the invitation is still sent the previous way and a warning is logged.

## v2.4 — 2026-10-20
- **Calendar invitations now come from ITOC**: booking events are created on the itoc@sr.edu.sa calendar (organizer = ITOC)
  instead of the deploying account's calendar. Settings › CalendarId `primary` or empty now means itoc@sr.edu.sa; `me` keeps the old behaviour.
- The shared ITOC calendar is subscribed automatically the first time it is used.
- No more silent fallback: if the ITOC calendar is not shared with edit rights, a warning is logged.
- New menu item **فحص المُرسِل والتقويم (ITOC)** checks the e-mail sender alias and write access to the ITOC calendar and says exactly what is missing.

## v2.3 — 2026-10-20
- Booking confirmation (on-site): removed the checklist item «أحضر جهازك المحمول لتطبيق الإعدادات مباشرة أثناء الجلسة». The list now has two items.

## v2.2 — 2026-10-20
- **Question marks removed from all e-mails.** Emoji (✅ ⏰ 📅 📍 🎥 ✓ ✕ ★) and hidden Unicode direction marks showed as «?» in some
  mail clients (Outlook for Windows). They are gone from every subject, hero and body; the hero now shows the Coffee with IT mark and title only.
- **Booking confirmation e-mail redesigned**: clearer opening, "تفاصيل الحجز" card (topic, date, time, duration on its own row, attendance mode,
  booking number), numbered "قبل الجلسة" checklist (works in RTL in every client), and a «إدارة الحجز» button.
- Times read «من 11:00 إلى 11:10» without hidden marks; the Zoom meeting ID is shown as 813-3519-1824 so its groups never reverse.
- English words in the topic (e.g. "Read AI") stay attached to the preceding Arabic word with a proper space in the details card.

## v2.1 — 2026-10-20
- **All e-mails are now sent from itoc@sr.edu.sa** (was the deploying account, m.elmahdy@sr.edu.sa): booking confirmation,
  cancellation, reminder and the thank-you + rating e-mail. Display name stays «Coffee with IT · ITOC»; replies still go to servicedesk@sr.edu.sa.
- Sending moved from `MailApp` to `GmailApp` (one helper, `mail_`) so a "Send mail as" alias can be used. New setting `MailFrom` (default itoc@sr.edu.sa).
- Safety fallback: if the deploying account cannot send as the configured address, the e-mail still goes out from the account itself
  and a warning is logged; the admin test e-mail reports the sender actually used.

## v2.0 — 2026-10-19
- **Rating e-mail fixed for Outlook for Windows**: the 1–5 choices broke into scattered boxes because Outlook ignores `display:block`,
  borders and radius on links. Each choice is now a fixed-size table cell carrying the border and background; all five are equal width and height.
- Rating scale reads 1 → 5 from the right in the e-mail and on the rating page (consistent in every client).
- Hero (all e-mails): solid "Coffee with IT · 10 min" badge (Outlook ignored the translucent one) and the icon circle is now a table cell.
- Time range keeps its spaces («من 10:00 إلى 10:10»); English phrases in the topic such as "Read AI" no longer split across lines.

## v1.9 — 2026-10-19
- **Thank-you + rating e-mail after each session**, following the Event Attendance platform's model: one overall-satisfaction question on a
  5-point scale (bilingual labels) with clickable 1–5 buttons, then an open suggestions question on the rating page.
- New **rating page** (`Rate.html`, `?page=rate&id=…`): restricted to the attendee, one response per booking (resubmitting updates it),
  available only after the session ends. Responses are stored in the new **Ratings** sheet.
- Sending: manual per booking or in bulk ("all ended sessions") from the admin dashboard, plus an automatic hourly job (`hourlyJobs`,
  which also sends the reminders) that e-mails each attendee `ThanksDelayMinutes` (default 30) after the session ends. No-shows are skipped.
  The admin dashboard can send a test copy and turn on the automation.
- **Admin dashboard → Session evaluation**: average rating, number of responses, response rate, satisfaction %, distribution 1–5,
  average by topic, latest comments; rating column in the bookings table; rating and comment in the CSV export. All follow the active filters.
- **E-mails use the Cairo font** (loaded from Google Fonts), with Tahoma as the fallback for clients that block web fonts (Gmail, Outlook for Windows).
- New settings: `AutoThanks`, `ThanksDelayMinutes`, `WebAppUrl`.

## v1.8 — 2026-10-19
- Booking page: after a successful booking, the summary button changes to a green «✓ تم تأكيد الحجز» (disabled) until the user returns to the slots.
- Booking page: times read «من 11:45 إلى 11:55» in the summary and on the confirmation card (they had appeared reversed as 11:55 – 11:45).
- E-mail: the Zoom meeting ID (813 3519 1824) and the times are wrapped in Unicode left-to-right marks, so they no longer appear reversed in Gmail, which strips `dir` attributes.

## v1.7 — 2026-10-19
- Remote (Zoom) bookings: the confirmation and reminder e-mails include the Zoom meeting link
  (a "انضم إلى الجلسة عبر Zoom" button, the meeting ID and the full link). The link is also added to the calendar invite.
- The link comes from Settings › ZoomLink. If that cell is empty or still holds the placeholder, the built-in meeting
  (ID 813 3519 1824) is used.

## v1.6 — 2026-10-19
- Every booking e-mail (confirmation, cancellation, reminder) is now blind-copied (BCC) to **servicedesk@sr.edu.sa and m.elmahdy@sr.edu.sa**.
  Settings › NotifyEmail accepts several addresses (separated by `;` or `,`). Duplicates and the attendee's own address are removed automatically.

## v1.5 — 2026-10-19
- New **Coffee with IT logo** (approved proposal 2, "بخار رقمي": a cup whose steam is drawn as circuit lines with network nodes, in ITOC teal and SRU purple).
  Assets in `assets/`: color mark, white mark, app icon and horizontal lockups (SVG + PNG).
- Logo added to the booking page, admin dashboard and sign-in page headers, the e-mail header, and the browser tab icon (favicon).

## v1.4 — 2026-10-19
- E-mails: for remote (Zoom) bookings, the Zoom link box and the calendar line are replaced by
  "سيتم إرسال دعوة اجتماع Zoom".
- E-mails: the time is written as «من 11:45 إلى 11:55 · مدة الجلسة 10 دقائق». This removes the brackets that were flipping in Gmail.

## v1.3 — 2026-10-19
- **Admin dashboard** (`?page=admin`, admins only): KPIs (confirmed, upcoming, in person/remote, attendance rate, cancellations, sign-ins);
  filters (date range, quick ranges, status, mode, attendance, department, topic, search); charts by topic, department, mode and day;
  bookings table with attendance marking (حضر / لم يحضر) and cancellation (attendee notified); CSV export (Excel-ready, Arabic);
  printable A4 report / PDF of the filtered view.
- **Session topics**: new Topics sheet; required topic dropdown on the booking page; admins add, enable or disable topics from the dashboard.
  Each booking stores its topic, which appears in e-mails, calendar invites, reports and exports.
- **E-mails redesigned** (confirmation, cancellation, reminder): branded header with logos, details card, Zoom button or location box,
  calendar link, support footer with the ITOC logo. Every e-mail sends a **BCC copy to m.elmahdy@sr.edu.sa** (or Settings › NotifyEmail).
- Booking page shows an "لوحة الإدارة" link to admins.
- Bookings sheet gains the Attendance and Topic columns automatically.

## v1.2 — 2026-10-19
- Sign-in page connected to the deployed booking app (Apps Script Web App, sr.edu.sa domain).
- QR code for https://ictsru.github.io/coffee/ added to the sign-in page (desktop only) and provided in `assets/` (PNG + SVG).
- Packaged as a GitHub Pages repository: `index.html` at the root, app source in `apps-script/`, posters in `posters/`.
- Posters: real QR code and booking link (ictsru.github.io/coffee) replace the placeholders. Arabic v2.6, English v2.4.

## v1.1 — 2026-10-19
- Footer: ITOC logo linked to the ITOC forms hub, plus the support line
  ("For Support: Dial * or Send email to: servicedesk@sr.edu.sa").
- "Your details": e-mail field auto-filled (read-only) from the signed-in @sr.edu.sa account.
- Department: required dropdown built verbatim from the official SRU departments list (Oct 2026).

## v1.0 — 2026-10-19
- First release: date → time → attendance mode (in person / Zoom) → details.
- Google Sheet backend (Settings, Slots, Bookings, SignIns), automatic slot generation.
- @sr.edu.sa-only access, ITOC sign-in landing page, sign-in log (email, date, time).
- Confirmation/cancellation e-mails, optional calendar invite and hourly reminders; capacity lock; one active booking per user.
