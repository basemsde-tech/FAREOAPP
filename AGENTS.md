# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
Fareo is a single-file, client-only Progressive Web App (PWA) for taxi drivers
(shift calculator, weekly payout tracker, ATO/BAS tax reports). The entire app
lives in `index.html` (inline HTML + CSS + vanilla JS). There is **no build
system, no package manager, no backend, and no dependency install step.** All
data is stored in the browser's `localStorage` (keys prefixed `fareo_*`).

- `index.html` — the whole app (source of truth, currently v5.7)
- `sw.js` — service worker (offline cache)
- `manifest.webmanifest`, `404.html`, `*.png` icons — PWA assets
- `fareo-github/` — a **stale duplicate** (v5.3). Ignore it; the repo root is the real app.

### Running it (development)
Serve the repo root over HTTP — a real HTTP origin is required because service
workers / PWA features do **not** work from `file://`. From `/workspace`:

```
python3 -m http.server 8000   # then open http://localhost:8000
```

(`node`/`npx serve .` also works.) There is no separate dev/prod build; serving
the static files IS development mode. No env vars are needed.

### Lint / test / build
There are **no** lint, test, or build tooling configured in this repo (no
`package.json`, no CI). "Build" is just the static files themselves. Verification
is manual: load the app in a browser and exercise the UI.

### Non-obvious gotchas
- The "Log Shift" flow is a 3-step wizard: **Log Shift → Attach → Review**. You
  cannot reach Review (and thus "Save to Weekly only") until the **Attach** step
  is satisfied: a receipt file must be attached AND the hail-trips count field
  must be non-empty (`docsOk()` in `index.html`). Type a number directly into the
  hail-trips input; you can attach any image/PDF (e.g. `favicon-64-v52.png`) as
  the receipt.
- Saving on the Review step also requires selecting a **Vehicle Rego** from the
  dropdown (defaults include `5088M`).
- NET TAKE-HOME = gross × operator share (default 55%), minus cash you already
  hold. Example: $200 EOS → $110.00; add $50 cash fare → $87.50.
- To reset app state during testing, run `localStorage.clear(); location.reload()`
  in the browser console.
- Cloud sync (Settings → Advanced) is fully optional and only used if the user
  pastes their own Firebase config; it is not needed to run or test the core app.
