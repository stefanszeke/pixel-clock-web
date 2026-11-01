# Little Pixel for Firefox — v6.19.0 (release candidate, unsigned)

This WebExtension uses Little Pixel v6.18 as Firefox's New Tab page, with a refined Firefox integration and Factory Reset. This is **not** the GitHub Pages build and is **not yet Mozilla-signed**. Signing is required for permanent installation on standard Firefox.

## Test it in Firefox Desktop

1. First, **export a JSON backup** from your current Little Pixel web app: **Settings → General → Export everything**. (The website and extension have different storage.)
2. Unzip this package into a folder.
3. In Firefox, visit **`about:debugging#/runtime/this-firefox`**.
4. Select **Load Temporary Add-on**, then choose **`manifest.json`** from the extracted folder.
5. Open a **new tab**. Little Pixel should appear.
6. Import your backup using **Settings → General → Import everything**.
7. Under **Settings → General → Firefox Integration**, enable the options you want.
8. In **Settings → Notes**, enable notifications and use **Send test notification**.

Firefox automatically unloads temporary add-ons when it restarts. To install permanently on normal Firefox, the package must be signed (typically through AMO). The add-on ID in `manifest.json` must remain stable for sync data to be associated with the same extension.

## What 'Firefox shortcuts sync' actually means

- The optional **Follow Firefox New Tab shortcuts** setting reads the native New Tab shortcuts using Firefox's `topSites` API. It imports new sites and refreshes the names of automatically followed sites (unless you renamed those sites yourself).
- It runs when New Tab opens and periodically every 15 minutes while Firefox is running. Use **Import shortcuts now** to force a fresh one-time merge.
- It does **not** modify native Firefox shortcuts: WebExtensions do not have a supported API to add, pin, remove, or rearrange Firefox's own New Tab shortcuts. Links removed from Firefox are **not** automatically deleted from Little Pixel, to protect custom layouts/groups.
- The native New Tab shortcut list may contain frequently visited sites, not only manually pinned links. What Firefox returns depends on the browser/profile.

## Where data is saved

- **Firefox `storage.local` (in the Firefox profile)** holds the full Little Pixel settings, notes, reminders, links, groups, and uploaded wallpapers and icon images. The WebExtension page also keeps its existing localStorage state for compatibility.
- **Firefox `storage.sync`** can synchronize settings, links, groups, and notes between supported **desktop Firefox profiles** signed in to the same Mozilla account, with **Add-ons** sync enabled in Firefox settings.
- **Uploaded wallpaper images and uploaded shortcut icons remain local** to each profile, because Firefox limits extension sync to **100 KiB total**, **8 KiB per item**, and up to 512 items. Large configurations can exceed these limits; use **Export everything** for complete backups and transfers.
- Firefox for Android currently **does not support `storage.sync`** for extensions. The extension is targeted at desktop Firefox.
- Cross-profile sync is not immediate. Mozilla describes periodic sync; Firefox's own **Sync Now** action can request an earlier sync. The extension's **Sync now** button writes the local data into Firefox extension sync storage but does not force Mozilla's account servers to sync instantly.
- On multiple desktop profiles, conflicting changes may be resolved by the newer saved copy. Please keep a JSON backup before substantial changes.

## Reminder notifications

- Under **Settings → Notes**, enable notifications and send a test notification. This uses Firefox's native `notifications` API.
- An extension background alarm checks timed, incomplete reminders every minute while Firefox is running, even with no Little Pixel tab open.
- Notifications require a **date and time**; undated/date-only notes do not send notifications.
- If Firefox is shut down, notifications are **not guaranteed**. The extension does not use a remote push service. Due reminders are only notified during a short grace window after the due time.
- Firefox and Windows notification preferences, Focus Assist / Do Not Disturb, and other device settings may still suppress visible alerts.

## Permissions and privacy

`storage` for local/profile storage and desktop sync; `topSites` to read Firefox New Tab sites; `alarms` for background reminder checks and periodic import; `notifications` for native desktop alerts. The add-on does **not** request browsing history access, cookies, passwords, or unrestricted website access. No external server is needed for the clock/calendar/notes. Website favicon lookup, when selected, may access an external favicon provider.

## Development layout

- `manifest.json` — Firefox Manifest V3 New Tab override and permissions
- `background.js` — storage, Firefox shortcut import, sync, and reminder alarms
- `boot.js` — restores the Firefox profile state before loading the app
- `bridge-client.js` — connects Little Pixel app changes with the extension background
- `app.js` / `index.html` — the v6.18 application extracted to external scripts for Firefox CSP

For a production release, test signing, multi-profile sync conflicts, storage limits, and native shortcut results in a real Firefox session. This package was statically validated and smoke-tested with a mocked extension API, but not installed in a real Firefox browser here.


## v6.19.0 defaults
- New Tab title set to `New Tab` by default.
- First-run shortcuts start empty and auto-follow Firefox native shortcuts.
- Default shortcut/clock/calendar settings updated to the current release profile.


## Factory reset (v6.19.0)

Settings → General → Data & Backups → **Factory reset…** wipes this extension's local notes, layouts, wallpapers, uploaded icons and other settings, clears its Firefox Sync storage, writes a clean default configuration, then re-imports Firefox-native shortcuts (if accessible). It does not reset Firefox itself, other add-ons, or Firefox's native shortcuts.

**Back up your data first!** A reset is destructive. If another synced Firefox profile remains open and writes old data again, those changes could reappear. Close Little Pixel in your other profiles before resetting if you need a clean test.

The Firefox Integration ⓘ help markers and tooltips distinguish native Firefox shortcut import from Little Pixel profile sync. The **Sync now** button does not force Mozilla's cloud sync to finish immediately.


## v6.19.1 – first-run & navigation improvements
- On an empty shortcut grid, click **Import Firefox shortcuts** to retry reading the browser's native New Tab and pinned site lists. It reports whether zero sites were returned or whether all were already present.
- Native site import is one-way. It does not modify native Firefox New Tab tiles. Depending on the Firefox profile, topSites may return recently visited sites as well as pinned entries.
- New Tab title remains *New Tab*. A custom tab favicon is no longer declared; Firefox decides the normal page icon. Extension branding stays in the manifest.
- Settings navigation is a compact 2-row icon-and-label palette instead of a horizontally scrolling row.
- **Export Firefox bookmarks HTML** makes a standard bookmarks import file from Little Pixel's shortcuts, preserving groups as bookmark folders. In Firefox use `Ctrl+Shift+O` → Import and Backup → Import Bookmarks from HTML. **This is not a native pinned New Tab JSON export** (Firefox's supported JSON backup is for bookmarks).

## 6.19.2 update / test

- Reload the temporary extension in `about:debugging#/runtime/this-firefox`, then open a new tab.
- If the shortcuts page is empty, select **Import Firefox shortcuts**. It now explicitly reloads the latest saved shortcut list, including any sites stored in the background by a previous attempt.
- Rose Night applies to fresh/default settings only. To try it with existing settings choose it manually in Style/Clock settings, or Factory Reset after exporting a backup.
- Tab icon: attempts the same browser-owned `chrome://branding/content/icon32.png` resource as Firefox New Tab. This may be blocked depending on Firefox security behavior; it is not bundled and we do not claim a guaranteed native icon.
