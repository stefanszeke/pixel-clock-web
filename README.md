# Little Pixel Clock v4 — GitHub Pages / offline PWA

A single-page, no-dependency pixel clock with 4 themes and a Monday-first calendar.

## What’s new

- Swipe left on the clock to show the calendar; swipe right to return. Desktop users can click the Clock / Calendar tabs. Fullscreen works on either page.
- Native pickers plus editable `#RRGGBB` color fields for digit, background and an optional separate date/calendar text color.
- More date formats including the requested `Saturday · 31 October 2026` and custom template tokens `dddd ddd D DD MMMM MMM M MM YYYY YY`.
- Weekday separators, date size, date font choices, and smooth-clock font choices (Minimal theme).
- Monday-first calendar, previous/next months, Today shortcut, date selection, current-day highlight.
- Colors and settings are saved locally per browser/device; existing v3 settings are retained.

## Publish to GitHub Pages

1. Create a public GitHub repository, e.g. `little-pixel-clock`.
2. Upload the **contents** of this folder into the repository **root**. Do not include the containing `pixel-clock-v4` folder.
3. In GitHub **Settings → Pages**, choose **Deploy from a branch**, `main`, `/ (root)`.
4. Visit `https://YOUR-USERNAME.github.io/little-pixel-clock/`.
5. On Android Chrome, select **Install app** or **Add to Home screen** to install the offline-capable PWA.

## Test locally

Use `python -m http.server 8000` in this folder and open `http://localhost:8000/` in a browser. Fullscreen and screen wake lock depend on your browser. The PWA service worker is available on HTTPS (GitHub Pages) or localhost. The clock and calendar can work offline once assets are cached.

Date and time are taken from the local device. There is no account sync; configuration is per browser/device. The calendar is a month viewer, **not yet an events/scheduling app**.
