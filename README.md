# Little Pixel Clock v5

A standalone clock and calendar, with no backend. Customization now has Appearance, Time & Date, Calendar, and Display tabs. The month calendar always uses a stable six-row grid, with larger day tiles, Monday-first weeks, tap-to-select, swipe-for-months, next/previous buttons and an always-visible Back to Clock button. The bottom Clock/Calendar switch can be hidden from the Calendar settings tab.

## Deploy

Upload all extracted files into the root of your GitHub Pages repository. Settings → Pages → Deploy from a branch → main / (root). Update your repository's existing files (especially `sw.js`) to ensure the offline cache changes from v4 to v5.

## Offline

Once opened online from GitHub Pages, the PWA can continue working offline using the registered service worker. Preferences are stored only on each device in localStorage.

## Android lock screen

The web app cannot display above the Android lock screen. An Android native activity can opt into showing above the keyguard (setShowWhenLocked), and an Android DreamService can create a charging screensaver. Neither feature alone turns the app into a secure kiosk.
