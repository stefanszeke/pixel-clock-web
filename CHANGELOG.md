## v6.21.10 — PiP-only launcher in bottom menu

- Kept Firefox Document Picture-in-Picture as the sole floating-window mode; one dock icon `▣` appears immediately before the Full screen icon `⛶`.
- Removed Window Tests and the alternative Panel, Popup, and `window.open` experimental launchers and related UI/CSS.
- PiP opens the currently selected page; if Firefox cannot open PiP, an in-app error is displayed instead of an unrelated popup.
- No changes to shortcut drag-and-drop, favicon import, notes, bottom menu customization, or saved settings.
- Syntax and local PiP smoke-tested. Native Firefox/Windows still controls PiP chrome and needs a real-world check.

## v6.21.9 — Direct drag, menu display fixes, desktop gestures and arrow keys

- Normal Shortcuts view: drag a shortcut or group onto an empty grid cell to move it, an occupied cell to swap positions, or a group tile to add the link to that group. Auto-arrange mode also accepts drag reordering. Click still opens a shortcut. Edit Mode remains for add/edit/bulk selection and delete.
- Desktop mouse gestures: drag across blank page areas to switch between Shortcuts, Clock and Calendar. A deliberate mouse gesture uses a larger threshold than touch; shortcuts, buttons and input fields are excluded to avoid accidental navigation.
- Bottom menu: icons-only mode hides the three page labels but retains accessible names and tooltips. Position (left/center/right) and scale (65–150%) continue to be independent settings.
- Fixed menu background opacity: apply the actual background alpha directly to the dock and reduce blur in tandem. Removed the background transition that made rapid slider changes appear unresponsive.
- Fixed keyboard arrows after selecting a bottom navigation button: document-level arrow handler allows focused dock buttons, but leaves text fields, sliders, dialog controls, and settings tabs alone.
- No changes to the one-time Firefox favicon-import logic: it may open briefly visible inactive tabs, and closes those created for lookup.
- Verified via local Chromium UI interactions and JavaScript syntax checks. Firefox/Windows behavior remains to be tested; native PiP window chrome is still Firefox-controlled.

## v6.21.8 — One-time import favicons + bottom menu controls

- First-run Firefox New Tab import now reuses native favicon data and asks Firefox to visit only missing-icon websites in temporary inactive tabs. Imports are bounded, de-duplicated per hostname, use at most four simultaneous tabs, and save everything once. The same enrichment runs on a manual native import; no continuous favicon monitoring is enabled.
- Required `tabs` metadata permission at install time so the first-run icon import can operate without a later user-gesture permission prompt. Missing icons never block import or overwrite existing saved/custom icons.
- The completed import redraws shortcuts in the current New Tab without a whole-app reload or switching the current page.
- Bottom menu Display settings: scale (65–150%), position (Left / Center / Right), and faster auto-hide after mouse leave (75ms rather than 300ms). When a mouse-clicked menu button keeps focus, auto-hide can now collapse after the pointer leaves.
- Tested with mocked Firefox import behavior (CDN favicons, duplicates, permission denied, timeout) and Chromium UI interactions (menu alignment, scaling, auto-hide, in-place import). Actual Firefox/Windows behavior still requires verification.

## v6.21.7 — Native favicon lookup on Save / Refresh

- Fix sites with nonstandard or CDN-hosted favicons, such as Duolingo: allow Firefox itself to load the site in an inactive temporary tab and report `tabs.Tab.favIconUrl`.
- Ask for optional `tabs` permission only in response to Save/Refresh (once, if not already granted). Do not request it on general dashboard activity.
- Preserve existing icons, and keep root-path probing as a fallback if tab access is denied or unavailable.
- No periodic refresh, app reload, icon proxy, or background monitoring.

## 6.21.6 — Simple shortcut favicons (editor-controlled)

- Removed the automatic favicon-repair switch, timers and tab listeners. No icon-related background refreshes.
- New links use favicon mode by default; saving looks for the icon in open Firefox tabs (when already permitted), Firefox's native favicon cache and the website's own common icon locations.
- Added **Refresh favicon** inside the shortcut editor to retry immediately, including for existing links.
- Preserves previously saved favicon data if the lookup fails and respects custom Text / Emoji, uploads and image URLs.
- Existing Firefox import still works, but no longer overwrites existing shortcut icons in the background.
- No external icon aggregator is used; sites that publish icons only in unusual page metadata may still need a manual Image URL.

## v6.21.5 — Create in empty cells, group selected links, automatic icon repair
- Free grid Edit Mode: click an empty cell to choose **New shortcut** or **New group**. On save the new item occupies that cell; cancel leaves the grid unchanged. Empty slots remain drag-and-drop destinations.
- Edit Mode selection: **Make group** opens the visual group editor with chosen standalone shortcuts already checked. Saving groups moves them into the new folder rather than duplicating them.
- Fixed the group-delete dialog layout where the global text-input rule made its checkbox huge and caused label overflow.
- Simplified manual icons to **Text / Emoji**, with a Windows Win + . tip. Removed the extra searchable symbol picker.
- Replaced manual favicon recovery with optional **Auto-repair website icons** in Firefox Integration. Grant Firefox tab access once; then matching website icons are cached automatically as their tabs load, while custom symbols and existing cached icons remain intact. The regular topSites/website fallbacks remain available without permission.
- PiP now sends a `disallowReturnToOpener` UI hint. Firefox still owns and may display the PiP address bar and OS title controls; no promise to remove them.
- Node syntax and static checks passed; real Firefox/Windows behavior remains to be tested.

## v6.21.4 — Bulk shortcut cleanup, tab favicon recovery, floating UI
- Shortcut Edit Mode supports multi-select and confirmed bulk delete for standalone links.
- Group deletion offers a default-off checkbox to also remove all its member links (otherwise dissolve to main grid).
- Added opt-in Firefox tabs API favicon recovery for currently open websites, including group members; never replaces a saved icon.
- Removed Little Pixel's full-width toolbar from experimental floating windows; compact hover controls only.
- Included optional Windows AutoHotkey borderless + pin helper in repository overlay, separate from Firefox extension ZIP.

# Little Pixel for Firefox — changelog

## v6.21.3 — Window-mode experiment, dialogs and automatic import

- Added a four-way window test panel: Document PiP, extension Panel, extension Popup and `window.open()`; explicit results and errors instead of silent fallbacks. No guarantee of always-on-top outside supported PiP.
- Removed native `alert`, `confirm`, and `prompt` from app actions. In-app dialog covers X/delete for shortcuts/groups, note deletion/bulk delete, saved themes, wallpaper reset, backup overwrite, and factory reset. Supports Firefox profiles where native website dialogs were suppressed.
- Notes Center checkboxes and bulk controls are always visible; removed selection-mode toggle.
- First-run Firefox New Tab import is now initiated automatically with canonical snapshot creation; multiple native lookups are serialized. After an import, refresh is automatic and preserves floating window query parameters. Manual Import stays available for retry.
- Passed JavaScript syntax, Chromium UI confirmation/notes/window-control tests, and mocked native import/favicon tests. Real Firefox window decorations and PiP are still unverified.


## v6.21.2 — Import, bookmark UX and favicon repair

- Moved Firefox bookmark-folder import into **Edit Mode → + Group → Create group from Firefox bookmark folder**; removed the always-visible Shortcuts toolbar button.
- Fixed native New Tab import's first-run no-snapshot bug and bounded Firefox site lookups plus the UI spinner. Broad top-sites lookups supply icons only, not extra shortcuts.
- Recovered legacy default-arrow icons by treating them as automatic favicons; preserve cached Firefox icons for existing links and folder members without erasing them on failed refreshes. Added extra same-origin favicon fallbacks.
- Float no longer opens a standard Firefox popup as a substitute for a clean always-on-top window. Only attempts genuine Document PiP and reports unsupported Firefox builds.
- Ran Chromium UI interaction and mocked Firefox background import tests; genuine Windows Firefox PiP remains unverified.

## v6.21.1 — Startup hotfix

- Clock and UI initialize even if Firefox background/native sites requests stall; background boot no longer waits for favicon lookup.
- Delayed background snapshots are applied cautiously so data is not overwritten after local edits.
- PiP failure shows a clear error and offers an explicitly labeled ordinary Firefox window instead of silently opening a browser-chrome popup.

## v6.21.0 — Direct ordering, reliable bookmark import, floating mode

- Removed redundant group-member reorder list; the group picker tiles reorder directly via desktop drag, touch long-press, or Alt + arrow keys.
- Firefox bookmarks API is now a required manifest permission; folder drag no longer fails because the optional API has not been granted. Added a searchable bookmark-folder picker and existing-group destination choice.
- Manual Firefox topSites import asks Firefox for cached favicon data, preserving it with linked shortcuts; common website icon fallback paths and site-initial fallback replace generic arrows.
- Added an optional floating dashboard: Document Picture-in-Picture (always-on-top) with an explicitly labeled standard Firefox popup alternative and pin/unpin switching. Firefox's PiP availability and topmost behavior require testing on a real desktop build.
- PowerShell build script now includes `floating.js`; release version 6.21.1.

## v6.20.0 — Grouping & release audit

- Reworked group editor: spacious, responsive grid of shortcut icons, search filter, selected count, and reorder list.
- In shortcut Edit mode, drag a link onto an existing group to move it inside, using desktop drag and touch long-press.
- New shortcuts now start with Website favicon mode.
- Drop individual bookmark URLs onto the shortcut grid; Firefox bookmark folder drop can create a group after optional bookmarks permission consent.
- When dragging a bookmark onto an existing group, append eligible links without duplicating URLs.
- Preserves group creation, dissolution, manual backup import/export and Firefox pinned-site JSON export.
- Release audit: Firefox Sync opt-in with consent, no third-party favicon proxy, save failure retries, suppress re-import of explicitly dismissed followed shortcuts.
- Manifest updated for optional data-transmission permission and optional bookmark-folder access.

## v6.19.4
- Added Firefox pinned New Tab JSON export and repaired PowerShell source-directory detection.

## v6.19.3
- Fixed colon blink/unlit pixels; improved short-window calendar layout, empty Shortcuts swipe, quick-add note placement, mobile settings.

## v6.19.2
- Corrected first-run Firefox topSites import and state hydration; Rose Night default; browser-owned tab icon reference.

## v6.19.1
- Added empty-state import action and bookmarks HTML export; redesigned Settings navigation.

## v6.19.0
- Firefox release candidate, Factory Reset, notifications, profile storage and integration settings.
