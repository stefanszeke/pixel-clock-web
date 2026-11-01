# Little Pixel v6.7

Single-page, offline-friendly app for GitHub Pages.

## New in this release
- Rename to Little Pixel (keeps previous `little-pixel-clock` localStorage key and existing shortcut settings).
- Grid width 40–100% and Free grid cell-height 72–160px.
- Drag shortcuts directly in edit mode; no Move button under every shortcut. On Android, hold a tile for half a second, drag it, and release over a new cell or icon. Holding and releasing without dragging selects it for tap-to-place.
- Edit a group to rearrange its members by dragging on desktop, hold-and-drag on touchscreens, or up/down buttons; their order appears in the folder popup.
- Edit dialogs do not auto-focus text inputs on Android; the keyboard appears only when a field is tapped, and closes after tapping non-text controls.
- Ocean Glass and Rose Night built-in styles.
- Theme Manager: Save current theme (style, colors, font/size options), load, update, delete. Up to 30 profiles.
- Custom themes are included in Export everything and Import everything backups.

## Usage
Upload all files from this folder to the root of your GitHub Pages repository. The app works fully offline once the service worker has cached the files. Previous on-device preferences should remain under the same origin.

Settings -> Shortcuts -> Layout & Size has the grid controls. Settings -> Style has My Themes below the six presets.

Some browsers require a refresh after updating the service worker.
