# Little Pixel — Firefox Add-on v6.19.0

**Unsigned release candidate** — intended for testing and for submission to Mozilla for signing.

1. Extract the package and open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on** and choose `manifest.json`.
3. Open a new tab. Little Pixel appears under the tab title **New Tab**.
4. For settings use the bottom menu's gear icon; in **General** you can find JSON backup, Firefox integration and Factory Reset.
5. Read `README-FIREFOX.md`, `CHANGELOG.md` and `RELEASE-CHECKLIST.md` before publishing.

**Important:** Temporary add-ons unload when Firefox restarts. Normal permanent installation requires Mozilla-signed XPI. The GitHub Pages build is separate.
