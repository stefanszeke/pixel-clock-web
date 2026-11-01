## v6.19.3 — Responsive fixes (2026-11-01)
- Blinking clock colon now dims to the configured unlit-pixel opacity instead of disappearing completely (pixel, segment, and text themes).
- Calendar on short and mobile screens reserves space for the floating bottom navigation, compresses month layout when needed, and permits scrolling rather than obscuring selected-day actions.
- Shortcuts empty-state panel allows horizontal swipe back to the clock (either direction when empty), with touch gestures not triggering accidental imports.
- Clock quick-add (+) moved directly below the date and kept centered in landscape, even with no notes.
- Settings categories on narrow phones become a compact seven-icon row with the current category name displayed beside Settings; categories remain keyboard accessible and have hover hints.
- All existing saved settings and notes remain compatible. Firefox background, sync, permissions, and native site import are unchanged.

# Little Pixel for Firefox — Changelog

## 6.19.2 — Import repair and theme defaults

- Fixed manual Firefox shortcut import where the extension had saved links but the open New Tab continued showing an empty grid. The Import action now returns the saved snapshot and refreshes the displayed grid.
- Better status message: reports how many links exist in Firefox profile storage, rather than saying “already imported” while showing an empty grid.
- New installations and Factory Reset use **Rose Night** as the default theme. Existing saved theme choices are unchanged.
- New Tab requests Firefox’s own built-in page favicon via `chrome://branding/content/icon32.png`. Rendering depends on browser security policy: some Firefox releases can block privileged icons inside extension pages. The extension’s own icon remains Little Pixel.
- Retains 6.19.1 functionality: native shortcut import/follow, Notes, reminders, Firefox Sync, editable shortcuts/groups, Factory Reset and bookmark HTML export.

# 6.19.1 — Firefox import and usability fixes

- Added empty shortcut prompt and manual native import with real error/zero-site feedback.
- Import now checks both native New Tab sites and pinned site retrieval paths.
- Removed custom New Tab favicon declarations; keeps the normal Firefox/default page icon.
- Redesigned settings category navigation into a compact two-row icon grid.
- Added Firefox-compatible bookmarks HTML export (distinct from Firefox pinned sites).
- Preserved existing profile state, reminders, sync and factory reset controls.

# Little Pixel for Firefox — v6.19.0

Release candidate · 1 November 2026

## Changes from the v6.18.1 preview

- **New Tab** is the tab title, rather than a development-version label.
- **First-run shortcuts** start empty and automatically import Firefox's available native New Tab sites. No example ChatGPT, YouTube, GitHub or Duolingo tiles.
- **Refined defaults** for the 12-column Free grid, clock lighting and date display, Monday-first calendar, weekend outlines and tiny note/reminder icons.
- **Factory reset…** in Settings → General → Data & Backups: removes Little Pixel profile data and Firefox-synced configuration, restores defaults and re-imports Firefox shortcuts. Confirmation required. The native Firefox shortcut list itself is untouched.
- **Help on hover / keyboard focus** for Firefox shortcut following and Firefox Sync, plus explanatory tooltips for Sync now, manual import, notification testing and several layout options.
- Includes the existing v6.18 clock, calendar, notes, reminders, shortcut folders, drag/reorder, themes, backgrounds, native shortcut import, desktop sync, and background notification checks.

## Known limitations

- Firefox native shortcuts can be **read into** Little Pixel, but cannot be modified from Little Pixel.
- Firefox profile sync is best-effort and applies to desktop Firefox. Uploaded wallpapers and shortcut image files remain local.
- Timed reminder notifications require Firefox to remain running and may be suppressed by OS settings. Notifications after browser shutdown are not guaranteed.
- This package is **unsigned**. A permanently installed add-on for standard Firefox requires Mozilla signing.
