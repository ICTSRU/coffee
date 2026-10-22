# Coffee with IT · v3.6

**Sulaiman Al Rajhi University · ICTD · IT Operations Center (ITOC)**

Booking system for the 10-minute **Coffee with IT** sessions. Staff choose a **topic**, **date**, **time** and **attendance mode** (in person at IT / remote via Zoom). Administrators follow up on all bookings and produce reports from the admin dashboard.

| | Link |
|---|---|
| Public page (GitHub Pages) | https://ictsru.github.io/coffee/ |
| Booking app (@sr.edu.sa only) | `…/exec`, reached through the sign-in button |
| **Admin dashboard** | `…/exec?page=admin` (owner m.elmahdy@sr.edu.sa + accounts granted from the dashboard › «صلاحيات الدخول على لوحة الإدارة») |
| Bookings sheet | "Coffee with IT — Bookings" (Google Drive) |

## Repository contents

| Path | Purpose |
|---|---|
| `index.html` | ITOC-branded sign-in page (ictsru.github.io/coffee), with a QR code for phones |
| `apps-script/Code.gs` | Server: slots, bookings, topics, admin API, e-mails, calendar invites, reminders, sign-in log |
| `apps-script/Index.html` | Booking page (topic dropdown, e-mail auto-filled, departments list) |
| `apps-script/Rate.html` | Session rating page (`…/exec?page=rate&id=…`): 5-point satisfaction scale + suggestions. Opened from the thank-you e-mail; only the attendee can rate. |
| `apps-script/Admin.html` | Admin dashboard: KPIs, filters, charts, attendance, cancellation, topic management, **session details (presenter / actual duration / notes)**, **presenters dashboard**, **presenter list**, **admin access management**, CSV export, printable PDF report |
| `apps-script/appsscript.json` | Manifest (Asia/Riyadh, sr.edu.sa domain) |
| `assets/` | QR code (PNG/SVG); SRU / ICTD / ITOC logos; **Coffee with IT logo (v3.0)**: `cwit-logo.png` (full bilingual logo, transparent), `cwit-logo-white.png` (on a white card, for dark backgrounds), `cwit-mark.png` (cup only, transparent), `cwit-badge.png` (cup on a white tile — e-mails), `cwit-favicon.png` / `cwit-icon.png` (app icon) |
| Shared styles | Tech background linked from the **SRU Brand Kit**: `https://ictsru.github.io/brand/css/sru-tech-bg.css` |
| `posters/ar`, `posters/en` | Awareness posters (PNG + PDF), Arabic v3.0 / English v3.0, with the Coffee with IT logo |
| `i18n/` | Language + theme layer source: `runtime.js` (detection, toggles, live translation), `theme.css` (light/dark tokens), `en.py` (Arabic → English dictionary), `build.py` (re-injects both into the four pages — run `python3 build.py` inside `i18n/` after editing) |
| `CHANGELOG.md`, `.nojekyll` | Change record; serve files as-is |

## Google Sheet

| Sheet | Notes |
|---|---|
| Settings | `MailFrom` (sender of every e-mail; default itoc@sr.edu.sa), session length, hours, location, Zoom link, `NotifyEmail` (BCC copy; defaults to servicedesk@sr.edu.sa + m.elmahdy@sr.edu.sa; separate addresses with `;`), `AdminEmails` |
| Slots | One row per slot; set `Active` to `FALSE` to close it |
| Bookings | Adds the **Attendance**, **Topic** and (v3.1) **Presenter**, **AdminNotes**, **DurationMin** and (v3.3) **Location**, **TopicOther** columns automatically on first use |
| Topics | **Created automatically.** Manage it from the admin dashboard (add / enable / disable) |
| Presenters | **v3.1 — created automatically**, pre-filled from the ITOC Team Directory v1.0 (14 names). Name, Email, Active, CreatedAt, CreatedBy. Managed from the dashboard (add / enable / disable); active names feed the presenter drop-down |
| Admins | **v3.1 — created automatically** (carries over any address in Settings › AdminEmails). Email, Name, Active, AddedAt, AddedBy. Only the system owner (m.elmahdy@sr.edu.sa) can grant, suspend or remove access from the dashboard |
| SignIns | Email, Date, Time for each visit |
| Ratings | **Created automatically.** One row per rated booking: Timestamp, BookingId, Email, Name, Department, Topic, SessionDate, SessionTime, Mode, Rating (1–5), Comment, UpdatedAt |

## Updating the live app to v3.6

**From v3.5 → v3.6:** replace **Code.gs**, **Index.html**, **Rate.html**, **Admin.html**, deploy a new version, and upload `index.html` to the `coffee` repository.
The Bookings column `Lang` and the Topics column `TopicEn` are added automatically.
Optional: add a Settings row `OnsiteLocationEn` with the English location text, and English names for existing topics (dashboard › «✎ الاسم الإنجليزي»).

**From v3.4 → v3.5:** publish **ICTSRU/brand** first (see the SRU Brand Kit package), then replace **Code.gs**, **Index.html**, **Rate.html**, **Admin.html**, deploy a new version, and upload `index.html` to the `coffee` repository.

**From v3.3 → v3.4:** replace **Code.gs**, **Index.html**, **Rate.html** and **Admin.html**, deploy a new version, and upload `index.html` + `assets/sru-tech-bg.css` to the `coffee` repository. No sheet changes.

**From v3.2 → v3.3:** replace **Code.gs**, **Index.html** and **Admin.html**, then deploy a new version. The Bookings columns `Location` and `TopicOther` are added automatically.

**From v3.1 → v3.2:** replace **Admin.html** and **Code.gs** (version number only), then deploy a new version. No sheet changes.

**From v3.0 → v3.1:** replace **Code.gs** and **Admin.html** only, then *Deploy → Manage deployments → ✏️ → New version*. The Presenters and Admins sheets and the three new Bookings columns are created on first open of the dashboard. No asset or e-mail changes.

### Full install / earlier versions

1. Open the Sheet → **Extensions → Apps Script**.
2. Replace the contents of **Code.gs** and **Index.html** with the files in `apps-script/`.
3. **+ → HTML** → name it **Admin** → paste `apps-script/Admin.html`. Do the same for **Rate** → `apps-script/Rate.html`.
4. Save → **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. The `/exec` URL does not change.
5. Upload this folder's contents to the `coffee` repository so that `assets/` is live (the e-mail logos load from there).
   **v3.0:** upload the new `assets/cwit-badge.png` and `assets/cwit-favicon.png` **before** deploying, or e-mails show a broken image.
6. Open `…/exec?page=admin` and add your session topics.
7. **Sender (v2.1):** e-mails are sent from **itoc@sr.edu.sa**. The deploying account must be able to send as that address — either
   deploy from the itoc@sr.edu.sa account itself, or in the deploying account's Gmail add it under
   **Settings → Accounts → Send mail as** and confirm it. Then run any function once in the editor and approve the new Gmail permission.
   Admin → «إرسال نسخة تجريبية» shows which address was actually used.
8. **Calendar invitations (v3.0):** invitations are created on the **itoc@sr.edu.sa** calendar so ITOC is the organizer.
   From the ITOC account share its calendar with the deploying account with **Make changes to events**.
   Then in the Sheet run **Coffee with IT → فحص المُرسِل والتقويم (ITOC)** — it reports what is still missing.
9. **No Google Meet in invitations (v3.0):** in the Apps Script editor click **Services (+) → Google Calendar API → v3 → Identifier `Calendar` → Add**
   (or paste the new `appsscript.json`). Without it the invitation still works but Google Meet may be attached.

## Publishing on GitHub Pages

Upload **the contents** of this folder to the root of the `ICTSRU/coffee` repository (including `.nojekyll`).
**Settings → Pages → Branch `main` / root**.
