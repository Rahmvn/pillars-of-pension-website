Static publication website for *Pillars of the Pension System in Nigeria*. Four semantic HTML pages share one stylesheet and one vanilla JavaScript file. There is no framework, backend, database, or runtime package dependency. Vercel uses a dependency-free copy step to prepare the deployment directory.

Run from this directory:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Open [the local website](http://127.0.0.1:8080/).

| Page | Static route | File |
| --- | --- | --- |
| Home | `/` | `index.html` |
| The Book | `/book.html` | `book.html` |
| The Author | `/author.html` | `author.html` |
| The Launch | `/launch.html` | `launch.html` |

`styles.css` contains the shared typography, colour tokens, navigation, photographic staging, reading layouts, and responsive rules. `navigation.js` manages the mobile navigation and the coming-soon action. Page links remain ordinary HTML links and also work without JavaScript.

The original Figma image exports are retained under `assets/images/`. The background and portrait also have lossless WebP copies for delivery; their decoded RGB pixels match the originals. The cover remains the original PNG. Geist is served locally, with its licence in `assets/fonts/OFL.txt`.

The approved designs and the subsequent requested refinements are documented in [the implementation report](qa/IMPLEMENTATION-REPORT.md). Screenshots are in `qa/screenshots/`; Figma comparison renders are in `qa/reference/`. Those renders are development evidence and are never used by the website.

Development checks use an existing Playwright installation through `PLAYWRIGHT_MODULE`, and optionally a browser executable through `BROWSER_PATH`. `qa/verify.cjs` checks the six requested widths and captures screenshots. `qa/interaction-checks.cjs` checks intermediate widths, navigation, keyboard behaviour, reduced motion, no-JavaScript navigation, local resource requests, and optional axe-core accessibility scans through `AXE_SCRIPT`. `QA_BROWSER=firefox` selects Firefox for the extended checks. No test dependencies were added to this project.

`qa/check-static-build.cjs` verifies the packaging allowlist, unchanged reviewed sources, local routes and conditional cache requests. `qa/focus-contrast.cjs` and `qa/measure-contrast.py` inspect painted focus indicators and the backgrounds of inconclusive axe text cases; these development checks use Python with Pillow. `qa/mobile-performance.cjs` records cold/warm local mobile network and CPU simulations. Set `QA_URL=http://127.0.0.1:8081` when testing the packaged preview. Run the extended axe checks before the focus inspection so its input report is current. Generated captures and temporary schema downloads remain outside the Git baseline.

Prepare and preview the exact deployment artifact:

```powershell
node scripts/build-static.cjs
$env:PORT = '8081'
node qa/serve-built.cjs
```

Open [the packaged site](http://127.0.0.1:8081/). The copy step replaces only the generated `dist/` directory and verifies that all 12 runtime files match their sources. `vercel.json` selects the static framework preset, skips dependency installation, and serves only `dist/`. `.vercelignore` restricts CLI uploads; `.gitignore` excludes generated screenshots, temporary files, build output, local Vercel state, and unused TTF downloads. Original design images, WOFF2, its licence, useful tests, and reports are retained in Git.

See [the staging procedure](docs/STAGING.md) for the exact Vercel configuration and the commands to run only after deployment approval. See [the production-readiness report](qa/PRODUCTION-READINESS.md) for focus contrast, source preservation, accessibility, caching, and mobile performance evidence. No deployment, push, or release has been performed.

Before publishing, confirm the real acquisition destination, printed author-name order, venue, start time, and RSVP arrangements. The button currently changes to **Coming soon**, and the event details retain the approved pending wording. The confirmed launch date and location are **9 November 2026, Lagos, Nigeria**.
