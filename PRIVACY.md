# Privacy summary — Little Pixel for Firefox

Little Pixel stores user-created notes, reminders, shortcuts, custom themes and preferences in the local Firefox extension profile. With Firefox Sync enabled, it also uses Firefox's extension sync storage to synchronize smaller settings, notes, shortcuts and groups across eligible desktop Firefox profiles. Uploaded wallpaper and icon images are excluded from cross-profile sync; they remain local.

The add-on requests only the `storage`, `topSites`, `alarms` and `notifications` permissions. The `topSites` permission reads Firefox's native New Tab sites for one-way import. It does not write back to Firefox's native shortcut list. Reminder notifications are triggered locally while Firefox is running. No Little Pixel developer account or custom server is required. Website favicons and user-chosen external icon URLs can generate requests to external image hosts when enabled.

Little Pixel does not request browser history, passwords or cookie permissions, and it does not run an analytics or advertising service. Exported JSON backups may include personal notes and should be stored privately.
