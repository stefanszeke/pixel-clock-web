## v6.21.10 native PiP-only check

- [ ] Dock shows one ▣ PiP icon immediately before the ⛶ fullscreen icon, including in icon-only and scaled menu modes.
- [ ] No Window Tests panel or four-way window mode menu remains.
- [ ] PiP opens the current view and can close without closing the main browser window.
- [ ] Unsupported PiP shows an in-app error without falling back to Firefox Popup/Panel.
- [ ] Shortcuts still drag/reorder outside Edit Mode and previous settings remain intact.

## v6.21.9 UI regression checks

- [x] Local simulated browser: normal-view drag swap, move to empty slot, move link into a group; group still opens on click.
- [x] Local simulated browser: menu icons-only saves preference, opacity renders transparent at 0% and opaque at 100% after input; desktop mouse swipe switches clock/calendar.
- [x] Local simulated browser: arrow keys work with the bottom navigation button focused and do not hijack keys in settings sliders.
- [ ] Firefox for Windows: confirm native HTML5 drag and drop of links/groups, keyboard arrows, menu opacity/position/scale and desktop swipe.
- [ ] Firefox for Windows: verify temporary favicon-import tabs close after a lookup, including unreachable websites and timeouts.
- [ ] Native Firefox Document PiP still retains browser-owned window chrome; no claim of a borderless window.

## v6.21.8 manual regression checks

- [ ] Test **fresh Firefox profile**: automatic New Tab import should bring in shortcuts and native icons, then discover missing icons such as Duolingo's via temporary tabs. Verify tabs close and no page reload occurs.
- [ ] Verify group members, notes, settings, custom icon choices, and any existing icon cache remain intact after import.
- [ ] Try manual import with several links from the same hostname; it should reuse one icon lookup per hostname and complete with a message even if some sites are unreachable.
- [ ] Confirm Firefox requests **tabs** permission on install (required for first-run icon discovery), and privacy notice explains the temporary visits.
- [ ] Open Settings → Display → Startup & Navigation: set bottom menu Left, Center, Right and 65–150% scale. Verify both expanded and auto-hidden arrow positions, fullscreen, and resized windows.
- [ ] Turn on Auto-hide, click a menu button, move the cursor out: menu should collapse promptly; opening Settings must keep controls accessible. Check keyboard navigation still works.
- [ ] No ongoing favicon-repair listener, periodic icon refresh, or page reload solely for icon updates.

# Little Pixel for Firefox v6.21.8 — Release checks

## Verified with the current source

- [x] All six JavaScript source files pass `node --check` (app, background, boot, bridge-client, display-init, floating).
- [x] Manifest MV3, stable extension ID, required `bookmarks` permission, explicit optional Firefox Sync data declarations.
- [x] Chromium UI simulation: new shortcut saves a Firefox-cached icon, one-shot refresh does not modify the profile until Save, failed refresh preserves a cached icon, custom symbols are untouched, and same-site /favicon.ico fallback is saved. Separate mocked background tests covered Firefox tab icons and native top-site icons without tabs permission.
- [x] Runtime ZIP root-level `manifest.json` with ten runtime files; no test scripts packaged.

## Verify on your own Firefox before AMO submission

- [ ] Export a full JSON backup first.
- [ ] Reload extension in `about:debugging` and confirm existing shortcuts, groups and notes remain intact.
- [ ] Create a new shortcut; confirm Website favicon is the selected default.
- [ ] Edit mode: drag a link onto a folder, then edit the folder, reorder, remove one link and dissolve the folder without deleting its members. Repeat with touch if relevant.
- [ ] Drag a bookmark URL from Firefox bookmarks toolbar/sidebar onto Shortcuts grid.
- [ ] Drag a folder from Firefox bookmarks sidebar onto grid. The Bookmarks API is pre-granted at extension update; verify folder creation and child links. Also use **Edit Mode → + Group → Create group from Firefox bookmark folder** as fallback.
- [ ] Test **▣ Float**: native Document Picture-in-Picture from extension pages, always-on-top behavior over other applications if supported, group shortcut links opening regular tabs, resize and close. If unsupported, verify it explains the limitation and opens no conventional popup.
- [ ] Verify existing favicon icons remain saved; try Edit → Refresh favicon on a missing icon. Some sites may still only show their initial.
- [ ] Test notes/clock/date/calendar and fullscreen at phone/narrow landscape/windowed sizes.
- [ ] Verify notifications for one imminent reminder with page closed and Firefox running.
- [ ] Opt in to Firefox Sync, then test data on a *second* desktop profile; verify that two independent edits do not unexpectedly overwrite each other. Currently last-writer-wins.
- [ ] Test Factory Reset only after saving a backup and closing other synced profiles.
- [ ] Run PowerShell packaging script on Windows; inspect generated `dist/` ZIP.
- [ ] Run Mozilla's addon lint/review, submit the unsigned ZIP for Mozilla signing, and retest the signed version across Firefox restart.

## Known limitations

- Native Firefox New Tab shortcuts can't be written back by this add-on.
- Firefox bookmarks folder drag formats and update-time permission prompts must be checked in real Firefox. Folder picker provides a supported fallback.
- Always-on-top is implemented through Document Picture-in-Picture; Firefox controls availability, lifetime and native PiP window decorations. No browser popup is opened as a fallback because it does not satisfy the requested clean interface.
- Cross-profile synchronization is last-writer-wins; it isn't conflict-free real-time collaboration.
- Notifications don't fire while Firefox is fully shut down.
- `browser.storage.sync` has quotas; wallpapers and uploaded image icons stay local.

## v6.21.3 manual verification on Firefox/Windows

- [ ] Backup settings, then install as a temporary add-on and confirm existing notes/shortcuts persist.
- [ ] On an empty profile, native New Tab shortcuts import automatically and show without a manual Refresh.
- [ ] Shortcut Edit Mode → X displays an **in-app** confirmation; Cancel preserves the shortcut, Confirm deletes it.
- [ ] Notes list always has checkboxes; Delete selected works even if website dialogs are suppressed.
- [ ] Click the bottom dock PiP icon (immediately before Full screen). Confirm only native PiP opens.
- [ ] The in-content PiP X closes only the PiP window, not the main Firefox window.

## v6.21.4 Firefox/Windows test matrix

- [ ] Back up profile; check Select all, Clear, checkboxes and Delete selected with many standalone links, in both grid/list layouts.
- [ ] Confirm deletion removes only selected normal shortcuts; grouped links are untouched, and followed Firefox New Tab shortcuts do not immediately reappear.
- [ ] Delete a group from tile X with the box **unchecked**: all its shortcuts return to the main grid.
- [ ] Delete a group from the group editor with **Also permanently delete** checked: its links disappear. Confirm Cancel is non-destructive.
- [ ] Save a new Duolingo shortcut with Website favicon; the icon should be found from Firefox cache or known website paths without enabling background repair. Open Edit → Refresh favicon to retry on demand.
- [ ] Check existing custom-uploaded icons and symbols are not overwritten by tab icon recovery; cached faviconData is preferred.
- [ ] Confirm the Window Tests UI no longer appears anywhere in the dashboard.
- [ ] Optional Windows test: run AutoHotkey v2 `LittlePixel-Floating-Helper.ahk`, focus **Panel**, Ctrl+Win+P to remove OS caption & pin; press again to restore. Do not apply to the main browser window.
- [ ] Native Firefox/Windows behavior has not been validated in this environment. Do not submit to AMO until the manual checks above pass.

## v6.21.5 additional Windows/Firefox checks
- [ ] In Free grid Edit Mode, click an empty cell → Shortcut → save; confirm the shortcut appears in the chosen cell. Repeat with Group. Cancel each editor once and confirm nothing is added.
- [ ] Select two standalone shortcuts → Make group → verify they are preselected, drag to reorder, save; confirm members move inside group without duplicates.
- [ ] Delete group both with and without the delete-members checkbox. Its label should wrap naturally and the checkbox should be normal size.
- [ ] Edit a shortcut → Text / Emoji: confirm the symbol search is gone; Win + . can enter an emoji.
- [ ] Settings → Firefox Integration → Auto-repair website icons: grant optional tabs permission. Open duolingo.com, wait for the favicon and confirm the icon appears without manual recovery; then reload to confirm persistence. Turn off the toggle and verify existing icon stays.
- [ ] Document PiP may still display Firefox's native address and title bars even with disallowReturnToOpener. This is a browser-controlled limitation.

6.21.6: verify no automatic favicon repair toggles/listeners remain, existing custom icons preserved, new link save gets a favicon, and manual Refresh changes only editor icon.

- [ ] In Firefox on Windows, create `https://www.duolingo.com/` with Website favicon; approve optional tabs access and confirm its owl favicon appears without reopening New Tab.
- [ ] Verify the temporary lookup tab disappears after Save / Refresh; it never closes existing user tabs.
- [ ] Retry with tab permission denied; normal shortcut creation still completes without a favicon.
- [ ] Test a previously saved favicon remains when lookup times out.
