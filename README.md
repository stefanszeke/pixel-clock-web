# Little Pixel Clock v6.3 — unified app

Upload the **contents** of this folder to the root of your GitHub Pages repository, including `favicon.svg`, `favicon.ico`, and `sw.js`.

## How to use
- The site opens directly on the full-size Clock / Shortcuts / Calendar screen; no separate editor or `?display=1` needed.
- The small bottom dock contains page navigation, **⚙ Settings**, and **⛶ Full screen**.
- Hide page buttons from Settings → General if you want a minimal dock. Gear and fullscreen remain available.
- Settings opens as a right-hand drawer on desktop or bottom sheet on phone; close using ×, outside tap, or Escape.
- On the Shortcuts page, **✎** enables adding, editing and rearranging links. Shortcut icon options from v6.2 are preserved.
- The Firefox new-tab URL can be just `/`, or `/?page=clock` if you want to force a page for each new tab. Old `?display=1` bookmarks still work.
- The app now has a custom pixel-style browser favicon (`favicon.svg` and `favicon.ico`).
- Offline web assets and the PWA manifest are included. GitHub Pages needs HTTPS for service worker caching.
- Prior settings and shortcuts are kept in the existing `little-pixel-clock` browser localStorage key.

**Note:** Browser fullscreen still needs a user gesture, and Firefox's address bar remains present in ordinary tab view. Settings are per browser and device, not cloud-synced.
