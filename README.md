# Little Pixel Clock v3 — GitHub Pages version

An entirely local, dependency-free clock. Date, themes, colors, clock size, pixel size and rounding are configurable. The **Keep visible** checkbox pins the live preview while you scroll settings; it is saved on your device. This version retains v2 settings using the same local-storage key.

## Publish from GitHub (no command line)

1. Create a **public** GitHub repository, for example `little-pixel-clock`.
2. Upload the **contents of this `github-pages` folder** into the repository root. Make sure `index.html` is at the root, not nested inside another folder.
3. In the repository go to **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select `main`, select `/(root)` and click **Save**.
4. Once GitHub Pages is deployed, the URL is `https://YOUR-USERNAME.github.io/little-pixel-clock/`. If the repository is named `YOUR-USERNAME.github.io`, it is `https://YOUR-USERNAME.github.io/`.
5. Visit from Chrome on Android; from the browser menu choose **Install app** or **Add to Home screen**. Open the installed app once while online; subsequent launches are cached for offline use.

GitHub Pages serves static files, no server or account system is needed. Settings are stored separately in each browser/device and do **not** synchronize via GitHub Pages. The site can still show a correct date and time without an Internet connection because it uses your device clock.