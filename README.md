# Coffee with IT · v1.2

**Sulaiman Al Rajhi University · ICTD · IT Operations Center (ITOC)**

Booking site for the 10-minute **Coffee with IT** session on protecting meeting data when using Read AI.
Staff choose a date, time and attendance mode (in person at IT, or remote via Zoom).

- **Public link (GitHub Pages):** https://ictsru.github.io/coffee/
- **Booking app (Apps Script, @sr.edu.sa only):** linked from the sign-in button on the page above
- **Bookings sheet:** "Coffee with IT — Bookings" (Google Drive, ITOC)

## Repository contents

| Path | Purpose |
|---|---|
| `index.html` | ITOC-branded sign-in page (the page at ictsru.github.io/coffee). Explains @sr.edu.sa sign-in and opens the booking app. Includes a QR code so desktop visitors can open it on their phones. |
| `apps-script/` | Source of the booking app (`Code.gs`, `Index.html`, `appsscript.json`). Not served by GitHub Pages; this copy is kept for version control. The live copy runs in the Google Sheet's Apps Script project. |
| `assets/qr-coffee.png` / `.svg` | QR code → https://ictsru.github.io/coffee/ (high error correction; SVG for print) |
| `posters/ar/`, `posters/en/` | Read AI data-leak awareness posters (Arabic v2.6, English v2.4), as PNG and PDF |
| `.nojekyll` | Serves files as-is on GitHub Pages |
| `CHANGELOG.md` | Change record |

## Publish to GitHub Pages

1. Create the repository **`coffee`** under the **ICTSRU** account (it must be named `coffee` for the link to be `ictsru.github.io/coffee/`).
2. Upload **the contents** of this folder (not the folder itself) so that `index.html` sits at the repository root.
   - Web upload: **Add file → Upload files** → drag everything in, including `.nojekyll`, then **Commit changes**.
3. **Settings → Pages → Build and deployment:** Source *Deploy from a branch* · Branch **`main`** · folder **`/ (root)`** → **Save**.
4. After about 1–2 minutes, open https://ictsru.github.io/coffee/ and test the sign-in button.

## Updating the booking app

Edit the code in the Apps Script project, then **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
The `/exec` URL stays the same, so `index.html` does not need to change. Copy the updated files into `apps-script/` here and add a CHANGELOG entry.
