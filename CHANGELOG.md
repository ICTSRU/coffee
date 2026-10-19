# Changelog — Coffee with IT

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
