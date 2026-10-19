# Coffee with IT · v1.5

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
| `apps-script/Admin.html` | Admin dashboard: KPIs, filters, charts, attendance, cancellation, topic management, CSV export, printable PDF report |
| `apps-script/appsscript.json` | Manifest (Asia/Riyadh, sr.edu.sa domain) |
| `assets/` | QR code (PNG/SVG); SRU / ICTD / ITOC logos; **Coffee with IT logo** (`cwit-mark`, `cwit-mark-white`, `cwit-icon`, `cwit-logo`, `cwit-logo-white`, as SVG/PNG). The e-mails and favicons load these from GitHub Pages, so keep them published. |
| `posters/ar`, `posters/en` | Awareness posters (PNG + PDF), Arabic v2.8 / English v2.6, with the Coffee with IT logo |
| `CHANGELOG.md`, `.nojekyll` | Change record; serve files as-is |

## Google Sheet

| Sheet | Notes |
|---|---|
| Settings | Session length, hours, location, Zoom link, `NotifyEmail` (BCC copy; defaults to m.elmahdy@sr.edu.sa), `AdminEmails` |
| Slots | One row per slot; set `Active` to `FALSE` to close it |
| Bookings | Adds the **Attendance** and **Topic** columns automatically on first use |
| Topics | **Created automatically.** Manage it from the admin dashboard (add / enable / disable) |
| SignIns | Email, Date, Time for each visit |

## Updating the live app to v1.5

1. Open the Sheet → **Extensions → Apps Script**.
2. Replace the contents of **Code.gs** and **Index.html** with the files in `apps-script/`.
3. **+ → HTML** → name it **Admin** → paste `apps-script/Admin.html`.
4. Save → **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. The `/exec` URL does not change.
5. Upload this folder's contents to the `coffee` repository so that `assets/` is live (the e-mail logos load from there).
6. Open `…/exec?page=admin` and add your session topics.

## Publishing on GitHub Pages

Upload **the contents** of this folder to the root of the `ICTSRU/coffee` repository (including `.nojekyll`).
**Settings → Pages → Branch `main` / root**.
