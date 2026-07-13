# Fareo

A single-file Progressive Web App (PWA) for taxi drivers — shift calculator,
weekly payout tracker, and ATO-ready tax/BAS reports. Works offline, installs
to your home screen. All data is stored locally in your browser.

**Current version:** 5.2

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
- `CACHE_NAME` in `sw.js` (e.g. `fareo-v5.2` → `fareo-v5.3`)
- `APP_VERSION` in `index.html`
- add a `CHANGELOG` entry in `index.html`

If you change the **app icon**, also give the icon files new names (the current
ones are stamped `-v52`; use `-v53`, etc.) and update those names in
`manifest.webmanifest`, the `<head>` of `index.html`, and the `ASSETS` list in
`sw.js`. Renaming is what forces phones to fetch the new icon instead of a
cached copy.

---

## Files
| File | Purpose |
|------|---------|
| `index.html` | The entire app (HTML + CSS + JS) |
| `sw.js` | Service worker (offline cache) |
| `manifest.webmanifest` | PWA install metadata |
| `404.html` | SPA fallback (copy of index.html) |
| `.nojekyll` | Tells GitHub Pages to skip Jekyll |
| `icon-*-v52.png` | App icons (standard + maskable) |
| `apple-touch-icon-v52.png` | iOS home-screen icon |
| `favicon-64-v52.png` | Browser tab icon |

---

## Your data
Data lives in your browser's local storage for the site's URL — it is **not**
stored in this repo. Deploying or updating the app does not touch it. You can
lose data only if you clear the browser's site data, switch browser/device
without syncing, or use **Start New Financial Year** in the app.

Before switching hosting or devices, use **Settings → Advanced → Backup →
Export backup** and keep the JSON file safe. **Restore backup** brings
everything back, including receipts.
