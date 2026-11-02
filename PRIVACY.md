# Little Pixel for Firefox — privacy (v6.21.8)

The extension saves shortcuts, groups, notes, reminders, custom themes and preferences in Firefox extension profile storage. A second localStorage copy supports the application UI. Large uploaded images and wallpaper files remain profile-local.

**Firefox Sync is off by default.** If explicitly enabled and permission granted, the extension sends shortcut URLs, group names, notes and smaller settings to Mozilla's Firefox Sync system for synchronization among eligible desktop Firefox profiles. It does not operate its own server, send analytics, or sell user data. Firefox Sync is subject to Mozilla's service and storage policies. The data collection manifest declares optional `browsingActivity` and `personalCommunications` for this opt-in feature.

The built-in Firefox New Tab shortcut import uses the `topSites` permission, and is read-only with respect to Firefox's own New Tab shortcuts. A dropped bookmark URL can be converted to a Little Pixel shortcut without bookmark access. The **`bookmarks` permission is required when installing/updating the extension** to enable bookmark folder dropping and the manual folder picker. The extension does not write, move or delete native Firefox bookmarks.


Backups exported as JSON can contain private notes and shortcuts. Handle them accordingly.

**Favicon lookup (v6.21.8):** The extension requests the Firefox `tabs` permission at installation so it can discover website favicons during the **one-time first-install native shortcut import**, without opening a permission prompt after installation. Importing manually or clicking Save/Refresh in the shortcut editor can also trigger lookup. It reads tab URLs and favicon URLs, not page content. For native sites whose favicon is missing, it may open a small number of inactive temporary tabs, wait for Firefox to discover each icon (including external/CDN icons), and close those temporary tabs. These visits can appear in browsing history, and may contact the shortcut websites. Each import is time-limited. It does not continuously monitor browsing or automatically refresh favicons afterwards, and it does not use external icon-lookup services. Saved icons and custom Text/Emoji or image choices are preserved.
