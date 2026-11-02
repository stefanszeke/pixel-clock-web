# Little Pixel — Firefox add-on v6.21.8 (unsigned experimental build)

Little Pixel replaces Firefox's New Tab page with a customizable mini-desktop: clock, calendar, shortcuts, groups, notes and reminders.

## Install for development

1. Extract the extension ZIP or use the source folder containing `manifest.json`.
2. In Firefox Desktop, open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on** → `manifest.json`.
4. Open a new tab. Temporary add-ons unload when Firefox restarts. A permanent install requires Mozilla signing.

## Shortcut UX (v6.21.5)

- **Edit shortcuts** with the pencil/cog button on Shortcuts. In **Free grid** mode, click an empty cell and choose Shortcut or Group. Newly created items appear in that exact cell. To group several links, check their selection boxes and click **Make group**. Drag tiles directly in the main grid to rearrange, including folders. Drag a link onto a folder tile to add it to that group. Mobile: long-press and move.
- Click a group in Edit mode to open the **visual group editor**. Check or uncheck tiles to select group members; **drag selected tiles directly in that same grid to reorder them** (Alt + arrow keys for keyboard). The redundant second reorder list has been removed. Removed members return to the main shortcuts grid when you save.
- New shortcuts use **Website favicon**. The extension prefers actual favicons cached by Firefox (`topSites.get({includeFavicon:true})`) for eligible sites, then tries common icon URLs on that site's own origin; if an icon is genuinely unavailable, it shows the site's initial, not a generic arrow. There is no third-party icon proxy.
- Drop a Firefox bookmark URL or folder onto Shortcuts. Bookmark folders require the built-in **`bookmarks` permission**, granted when installing/updating the extension; dragging directly from Firefox might still vary by Firefox version.
- The **↧ Bookmarks** toolbar button has been removed. Enter Shortcuts **Edit Mode → + Group → Create group from Firefox bookmark folder**. The searchable folder picker can create a new Little Pixel group or add links to an existing group. Firefox bookmarks are never modified. Duplicate URLs are skipped; up to 200 valid links per import, nested subfolders flattened.
- **Firefox New Tab auto-import:** on the first run with an empty grid, the extension initializes its profile snapshot and imports native Firefox New Tab/pinned sites automatically. After a successful import, shortcut data updates in place (no whole-page reload and no forced page switch). Lookups have time limits and show an error/retry if they fail; the manual Import button remains available. The initial automatic check runs once per profile to avoid repeated imports on every New Tab.
- **Favicon repairs:** old default ↗ placeholders are rendered as website icons rather than permanent symbols. Cached icons returned by Firefox are preserved, including for existing group members; missing icon responses never erase cached data. Extra same-site favicon locations are tried, and a site initial remains the fallback if no icon is reachable. No external favicon-proxy service is used.

## Floating window experiment (v6.21.4)

The top-left **▣ Window tests** button now opens four distinctly labeled experiments:

1. **Picture-in-Picture** (Document PiP): attempts a clean, always-on-top window. This requires `documentPictureInPicture.requestWindow` to be exposed to extension pages. Firefox's VIDEO PiP is not the same API; the request may fail. Failure is shown in the test panel, not hidden by a popup fallback.
2. **Firefox Panel**: calls `browser.windows.create({type:'panel', ...})`; MDN describes the panel type as having no normal address bar or toolbars, but Firefox and Windows may still display browser/window decoration.
3. **Firefox Popup**: calls `browser.windows.create({type:'popup', ...})`; Firefox may display a location bar, as earlier versions did on the user's Windows installation.
4. **window.open()**: a separate user-gesture window test with feature flags (`location=no`, `toolbar=no`, `popup=yes`); these flags are advisory, and Firefox can ignore them.

PiP sends a hint to hide the Return to Opener UI, but Firefox may ignore it and still display its address bar and title bar. The experiments report errors inside Little Pixel. **None of the normal window APIs guarantees always-on-top**; PiP might, when available. The new X button inside the experimental Panel/Popup attempts to close only its own small window. These window modes have **not** been tested in native Firefox/Windows yet. They are explicitly tests, not a promised borderless solution.

## Browser-independent app dialogs and Notes

- Shortcut and group X/deletion, notes (single and bulk), wallpaper resets, saved themes, settings backup restore and factory reset now use in-app confirmations rather than Firefox's suppressible `confirm()` dialogs.
- Naming a saved theme uses an in-app input instead of `prompt()`. In-app information messages replace `alert()`.
- In **Notes & reminders**, selection checkboxes and the bulk action bar are **always visible**. The separate Select/Done selecting toggle was removed. Clear deselects checked notes; Delete asks for an in-app confirmation and permanently deletes selected notes.

## Storage, sync and notifications

- Local Firefox profile storage retains full data including images.
- **Firefox Sync is OFF by default**; enabling it explicitly asks for Firefox's optional data-transmission consent. Only smaller data is synchronized; images remain local.
- The sync implementation uses newer-timestamp replacement, not item-level conflict merging. Avoid editing the same items simultaneously on two profiles. Export a full JSON backup before important changes.
- Timed reminders can notify you while Firefox is running. Closed Firefox processes cannot deliver reminders.
- Factory Reset clears Little Pixel's local data and sync copy and reimports Firefox-native shortcuts. It does not reset Firefox itself. Close other synced profiles before resetting to avoid old data returning.
- Native Firefox New Tab shortcuts are **read-only**: Little Pixel can import but cannot write back to them. The Firefox pinned-sites JSON export is intended for manual `about:config` recovery, not an official file import workflow.

## Build from C:\dev\pixel-clock

Place `build-firefox.ps1` beside `manifest.json` and run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build-firefox.ps1
```

The builder creates a versioned **unsigned** ZIP in `dist/` containing the eleven Firefox runtime files, with `manifest.json` at its root. `sw.js`, `manifest.webmanifest`, `.nojekyll` and site documentation stay outside the upload ZIP.

## Before publishing

Complete the release checklist. This package passed JavaScript syntax checks, Chromium UI simulation of window test controls, browser-independent deletion/notes selection, and mocked Firefox background import tests. It has **not** been tested in a real Firefox installation. Verify the actual window chrome, shortcut import and data persistence before publishing.

## v6.21.4: bulk cleanup, favicons, floating experiments

- **Edit Shortcuts:** checkboxes now appear on ordinary shortcuts. Select several or use **Select all**, then **Delete selected**. This works only on standalone shortcuts in the main grid; group contents are not affected. A Little Pixel confirmation appears before deletion. Followed Firefox New Tab items are added to the dismiss list so they do not immediately return on auto-import.
- **Delete a group (X or group editor):** the confirmation has an **Also permanently delete the shortcuts inside** checkbox. Unchecked (default) means the group is removed and its shortcuts become normal shortcuts; checked removes both. Neither operation changes Firefox bookmarks.
- **Floating experiments:** the 36-pixel-wide top header inside the experiment window is gone. The app now uses the full window height, with a tiny Tab/Close overlay revealed on hover at top-left. Firefox/Windows OS title bars remain unchanged by the extension.
- **Optional Windows-only enhancement:** the repo contains `LittlePixel-Floating-Helper.ahk`, an AutoHotkey v2 script. Open the Firefox **Panel** mode, focus its window, and press `Ctrl+Win+P` to toggle its title bar off and pin it above other windows. Press the hotkey again to restore. It changes only the focused Firefox Little Pixel window; no additional browser permission is needed. This helper is **not** bundled in the Firefox install package; test it separately and exit via Alt+F4 if necessary.

### Shortcut website icons (6.21.6)

New shortcuts default to Website favicon. Saving attempts a one-time lookup from Firefox tabs (if tab permission has already been approved), native Firefox top-site icons, then the site’s standard favicon paths. The editor has a **Refresh favicon** button. Neither action reloads the dashboard. There is no background favicon repair. Existing saved icons are retained on failed refresh.

### Native Firefox favicon discovery (6.21.7)

When you save a new **Website favicon** shortcut or click **Refresh favicon**, Little Pixel first checks open Firefox tabs and native New Tab icon cache. In v6.21.8, **tabs** permission is requested at installation to allow missing icon recovery on the first automatic import. With permission, it briefly opens the requested website in a background (inactive) Firefox tab, allowing Firefox itself to discover its actual `<link rel="icon">`, including icons hosted on CDNs or unusual paths. It closes only the temporary tab it created and stores the resolved favicon URL or image on the shortcut. No monitoring, background repair, third-party favicon service, or dashboard reload is used. The website will receive an ordinary visit; the brief temporary tab might be visible in Firefox's tab strip and History. If tab information is unavailable, standard-path fallback and existing icons remain intact.

If a website requires authentication, refuses loading, or hides its favicon in a way Firefox cannot expose within 11 seconds, the editor may still show its initial. Existing saved icons and Text/Emoji choices are preserved. This native Firefox behavior needs confirmation in a real Firefox profile.

### v6.21.8 — First-install favicon import and menu placement

Native Firefox New Tab imports (automatic first-run or manual) now keep Firefox-provided favicons and resolve only missing ones through Firefox native tab lookup. At most 4 inactive tabs run concurrently for up to about 21 seconds total, with up to 7 seconds per missing site. Multiple shortcuts on one hostname share the same lookup. All imported links persist even when some sites have no icon or are unreachable. When the import completes, it updates the current shortcut view without a full browser reload. There is no ongoing favicon refresh process.

**Required permissions:** `topSites` and `bookmarks` are retained; `tabs` is now also a required permission at installation because an automatic import cannot trigger a Firefox permissions prompt. It allows access to tab URLs/favicon metadata. The extension does not read web page text; the icon lookup itself causes a real website visit that may be visible in History. Optional Sync data permissions remain opt-in.

Settings → Display → Startup & Navigation now offers **Bottom menu position** (Left / Center / Right) and **Bottom menu scale** (65–150%, 100% default). These change only the navigation menu, not the shortcut-grid or clock scale. Auto-hide now closes shortly (~75 ms) after mouse leave, unless Settings are open or the menu has keyboard focus. Mobile scale is capped at 105% to avoid covering the narrow screen.
