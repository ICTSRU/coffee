# Changelog — Coffee with IT

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
