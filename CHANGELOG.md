# Changelog — Coffee with IT

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
