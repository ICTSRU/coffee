# Coffee with IT · v2.1

**Sulaiman Al Rajhi University · ICTD · IT Operations Center (ITOC)**

Booking system for the 10-minute **Coffee with IT** sessions. Staff choose a **topic**, **date**, **time** and **attendance mode** (in person at IT / remote via Zoom). Administrators follow up on all bookings and produce reports from the admin dashboard.

| | Link |
|---|---|
| Public page (GitHub Pages) | https://ictsru.github.io/coffee/ |
| Booking app (@sr.edu.sa only) | `…/exec`, reached through the sign-in button |
| **Admin dashboard** | `…/exec?page=admin` (admins only: m.elmahdy@sr.edu.sa plus Settings › AdminEmails) |
| Bookings sheet | "Coffee with IT — Bookings" (Google Drive) |

## Repository contents

| Path | Purpose |
|---|---|
| `index.html` | ITOC-branded sign-in page (ictsru.github.io/coffee), with a QR code for phones |
| `apps-script/Code.gs` | Server: slots, bookings, topics, admin API, e-mails, calendar invites, reminders, sign-in log |
| `apps-script/Index.html` | Booking page (topic dropdown, e-mail auto-filled, departments list) |
| `apps-script/Rate.html` | Session rating page (`…/exec?page=rate&id=…`): 5-point satisfaction scale + suggestions. Opened from the thank-you e-mail; only the attendee can rate. |
| `apps-script/Admin.html` | Admin dashboard: KPIs, filters, charts, attendance, cancellation, topic management, CSV export, printable PDF report |
| `apps-script/appsscript.json` | Manifest (Asia/Riyadh, sr.edu.sa domain) |
| `assets/` | QR code (PNG/SVG); SRU / ICTD / ITOC logos; **Coffee with IT logo** (`cwit-mark`, `cwit-mark-white`, `cwit-icon`, `cwit-logo`, `cwit-logo-white`, as SVG/PNG). The e-mails and favicons load these from GitHub Pages, so keep them published. |
| `posters/ar`, `posters/en` | Awareness posters (PNG + PDF), Arabic v2.8 / English v2.6, with the Coffee with IT logo |
| `CHANGELOG.md`, `.nojekyll` | Change record; serve files as-is |

## Google Sheet

| Sheet | Notes |
|---|---|
| Settings | `MailFrom` (sender of every e-mail; default itoc@sr.edu.sa), session length, hours, location, Zoom link, `NotifyEmail` (BCC copy; defaults to servicedesk@sr.edu.sa + m.elmahdy@sr.edu.sa; separate addresses with `;`), `AdminEmails` |
| Slots | One row per slot; set `Active` to `FALSE` to close it |
| Bookings | Adds the **Attendance** and **Topic** columns automatically on first use |
| Topics | **Created automatically.** Manage it from the admin dashboard (add / enable / disable) |
| SignIns | Email, Date, Time for each visit |
| Ratings | **Created automatically.** One row per rated booking: Timestamp, BookingId, Email, Name, Department, Topic, SessionDate, SessionTime, Mode, Rating (1–5), Comment, UpdatedAt |

## Updating the live app to v2.1

1. Open the Sheet → **Extensions → Apps Script**.
2. Replace the contents of **Code.gs** and **Index.html** with the files in `apps-script/`.
3. **+ → HTML** → name it **Admin** → paste `apps-script/Admin.html`. Do the same for **Rate** → `apps-script/Rate.html`.
4. Save → **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. The `/exec` URL does not change.
5. Upload this folder's contents to the `coffee` repository so that `assets/` is live (the e-mail logos load from there).
6. Open `…/exec?page=admin` and add your session topics.
7. **Sender (v2.1):** e-mails are sent from **itoc@sr.edu.sa**. The deploying account must be able to send as that address — either
   deploy from the itoc@sr.edu.sa account itself, or in the deploying account's Gmail add it under
   **Settings → Accounts → Send mail as** and confirm it. Then run any function once in the editor and approve the new Gmail permission.
   Admin → «إرسال نسخة تجريبية» shows which address was actually used.

## Publishing on GitHub Pages

Upload **the contents** of this folder to the root of the `ICTSRU/coffee` repository (including `.nojekyll`).
**Settings → Pages → Branch `main` / root**.
