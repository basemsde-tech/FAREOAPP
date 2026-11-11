# Fareo

A single-file Progressive Web App (PWA) for taxi drivers — shift calculator,
client run planner,
weekly payout tracker, and ATO-ready tax/BAS reports. Works offline, installs
to your home screen. All data is stored locally in your browser.

**Current version:** 16.0

---

## Deploy with GitHub Pages

1. Create a new repository (e.g. `fareo`) and push these files to it — the files
   must sit at the **root** of the repo (not inside a subfolder).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder, then **Save**.
5. Wait ~1 minute. Your app will be live at:
   `https://YOUR-USERNAME.github.io/fareo/`

That URL is what you install as a PWA.

### Notes for GitHub Pages
- `.nojekyll` is included so GitHub serves every file as-is (without it, Jekyll
  can ignore or rewrite files).
- `404.html` is a copy of `index.html` so refreshes and deep links load the app
  instead of a GitHub 404 page.
- All asset paths are **relative** (`./…`), so the app works whether it's served
  from a root domain or a `/fareo/` subpath.

---

## Updating the app
When you push changes, bump these together so returning users get the update:
- `CACHE_NAME` in `sw.js` (e.g. `fareo-v13.0` → `fareo-v13.1`)
- `APP_VERSION` in `index.html`
- add a `CHANGELOG` entry in `index.html`
- copy `index.html` over `404.html`

If you change the **app icon**, also give the icon files new names (the current
ones are stamped `-v90`; use `-v91`, etc.) and update those names in
`manifest.webmanifest`, the `<head>` of `index.html`, and the `ASSETS` list in
`sw.js`. Renaming is what forces phones to fetch the new icon instead of a
cached copy.

---

## Tests
The pay, BAS and income tax maths has a test suite that drives the real functions in `index.html`:

```
npm install --no-save playwright && npx playwright install chromium
node tests/calc.test.js
```

Run it before every release, and update `TAX_TABLES` / `MEDICARE_LOW` in `index.html` when the ATO publishes new rates.

---

## Files
| File | Purpose |
|------|---------|
| `index.html` | The entire app (HTML + CSS + JS) |
| `sw.js` | Service worker (offline cache) |
| `manifest.webmanifest` | PWA install metadata |
| `404.html` | SPA fallback (copy of index.html) |
| `.nojekyll` | Tells GitHub Pages to skip Jekyll |
| `icon-*-v100.png` | App icons (standard + maskable) |
| `apple-touch-icon-v100.png` | iOS home-screen icon |
| `favicon-64-v100.png` | Browser tab icon |

---

## Your data
Data lives only in your browser's local storage on each device. It is **not**
stored in this repo and nothing syncs between devices. Deploying or updating
the app does not touch it. You can lose data only if you clear the browser's
site data or use **Start New Financial Year** in the app.

**Google Drive backup** (Settings → Backup & restore) saves one backup file to
Drive › Fareo at the frequency you choose (after changes, daily, each pay week, weekly or
monthly), replacing it each time. **Restore from Drive** brings it back on any
device. Fareo uses the `drive.file` scope, so it can only see files it created.
The Google Drive API must be enabled for the Firebase project
(`drive2earn-f3fb3`) in Google Cloud.

**Export backup** / **Restore backup** still work with a JSON file, receipts
included.


## Android app (Galaxy Z Fold and other phones)

`twa/` is a Trusted Web Activity: a small Android app that opens the live
site in Chrome, full-screen. It shares Chrome's storage, so the data already
on the phone, Google Drive backup and offline mode all work as in the browser.
It is resizable and keeps running through fold / unfold.

- **Build:** any change under `twa/` on `main` runs *Build Fareo Android* and
  publishes `Fareo-unsigned.apk` to a release `android-v<version>-b<run>`.
  Bump `twa/version.txt` for a new version name.
- **Sign:** with the Fareo key (kept outside this repo), e.g.
  `java -jar uber-apk-signer.jar --apks Fareo-unsigned.apk --ks fareo-release.jks --ksAlias fareo`.
  Every update must be signed with the same key to install over the old one.
- **Full screen:** `https://basemsde-tech.github.io/.well-known/assetlinks.json`
  (repo `basemsde-tech.github.io`) must list package `au.fareo.app` and the
  key's SHA-256 fingerprint:
  `3E:4C:DB:64:E0:8A:4E:6B:87:1F:05:2B:3F:73:3A:FD:AF:A5:E3:59:EE:10:24:D6:B0:9A:FF:BD:F5:0A:34:17`
