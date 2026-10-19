# Changelog — Coffee with IT

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
