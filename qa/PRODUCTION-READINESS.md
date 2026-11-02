Production-readiness preparation completed locally on 2 November 2026. The independent review remains the baseline. No page was redesigned, and no approved copy, layout, navigation behaviour, event detail, or original design asset was changed. Coming soon remains in place.

The only runtime changes are four focus-related CSS changes: a dark green `#29372e` focus token, an ivory keyline, the matching primary-action outline, and an inset focus ring for mobile/tablet navigation links so scrolling does not clip the indicator. Other CSS rules are unchanged. The four HTML documents, `navigation.js`, and all existing assets were compared with `approved-source-hashes.json` and remain byte-identical. No images were modified, resized, or recompressed.

Focus and accessibility verification:

| Check | Result |
| --- | --- |
| Rendered focus states across all pages at 390, 768, and 1440px | 85 states passed, including skip links, hamburger/close controls, every destination, and primary-action default/hover/pressed states |
| Focus stroke against sampled adjacent rendered colours | Minimum **6.89:1**, exceeding the requested 3:1; actual stroke pixels were also checked to detect a clipped/missing ring |
| Chromium axe WCAG A/AA scans | 12 phone/desktop and open/closed menu scans; zero reported violations |
| Axe's inconclusive text-contrast cases | All 25 inspected using actual rendered backgrounds with the foreground temporarily hidden; minimum **6.641:1**, above each element's applicable text threshold |
| Requested widths | All 24 page/width cases passed at 320, 375, 390, 430, 768, and 1440px |
| Intermediate widths | 52 cases passed in Chromium 147.0.7727.15 and 52 in Firefox 151.0 |
| Page navigation | 32 source/destination pairs passed in each browser; current-page selection does not reload |
| Keyboard and menu behaviour | Skip link, visible focus, Coming soon activation, Escape, outside dismissal, focus containment/return, breakpoint handoff, and short-viewport menu scrolling passed |
| Other behaviour | Back/Forward, reduced motion, navigation without JavaScript, image loading, and no clipped/overlapping text passed |

The 25 inconclusive cases were the Home introduction over the layered photograph, plus six menu labels/controls per phone page whose solid ivory background is painted by a pseudo-element. They were inspected rather than dismissed. The pixel checks compare each original text colour against the darkest-contrast background pixel across its text rectangles. Focus captures were also visually inspected. Captures and temporary sampling data remain locally under ignored `qa/artifacts/`; the useful numeric evidence is retained in `contrast-results.json` and `accessibility-chromium.json`. These checks do not constitute physical-device or real screen-reader acceptance; Safari was not tested.

Deployment preparation adds `vercel.json`, `.vercelignore`, a 12-file runtime allowlist, and a dependency-free copy script. `node scripts/build-static.cjs` produces `dist/` and verifies every output against its source hash. There is no application server, framework, bundler, or installed project dependency. The Node preview server is a development-only test harness and is not in the deployment.

All four existing routes and every packaged asset returned 200 from the built artifact. Conditional requests returned 304 with ETags. Resource references resolve inside the allowlist. Unknown and development paths returned 404, including QA files, Git metadata, configuration, README, build scripts, and source-only image alternatives. CLI upload filtering was tested separately. All configured Vercel properties were validated against their corresponding official schema definitions; no native Vercel build, project linking, authentication, or hosted request has been performed.

Browser caching is deliberately conservative for these unversioned filenames: `public, max-age=0, must-revalidate`. The browser can reuse unchanged bodies after validation without retaining stale cover, event information, styles, or scripts across updates. A year-long immutable policy was not applied to filenames that may be replaced. The actual Vercel/CDN headers and behaviour must still be checked on an approved Preview; the local harness is not a CDN emulator.

Mobile loading was measured in isolated Chromium contexts at 390 × 844px, with touch enabled, 1.6 Mbps download, 0.75 Mbps upload, 150ms latency, and 4× CPU slowdown. Each page had a cold direct visit followed by a warm visit in the same context. Resource transfer excludes the HTML document. This is an uncompressed localhost simulation, not Lighthouse, a physical phone measurement, hosted Vercel performance, or field Core Web Vitals.

| Page | Cold LCP | Warm LCP | Cold resource transfer | Warm resource transfer | Observed CLS |
| --- | --- | --- | --- | --- | --- |
| Home | 6.76s | 0.54s | 1.26 MB | 1.8 KB | 0 |
| Book | 0.99s | 0.53s | 1.18 MB | 1.2 KB | 0 |
| Author | 12.21s | 0.58s | 2.35 MB | 1.5 KB | 0 |
| Launch | 1.00s | 0.52s | 1.18 MB | 1.2 KB | 0 |

All requests remain local. Existing WOFF2 and lossless WebP delivery files were retained. Images dominate the cold payload, especially the 1.12 MB background and 1.17 MB portrait. Home and Author cold LCP are a public-launch performance concern on this constrained connection; warm cache reuse does not remove the first-visit bandwidth cost. No new asset transformation was introduced in this bounded preparation. A later image-delivery optimization should be evaluated against the approved imagery and an agreed mobile performance target.

The local Git repository uses `main` and the existing configured Git identity. Its baseline includes the website, original design images, current delivery assets and font licence, essential documentation, useful QA scripts, and text/JSON reports. Generated screenshots, reference renders, temporary schema/sample files, `dist/`, local Vercel state, archives, and unused TTF downloads are excluded while preserved locally. The containing baseline commit can be identified with `git log -1 --oneline`; no artificial history, remote, push, tag, or release was created.

An export of only the staged Git files also completed the static build and artifact checks successfully, without the ignored font downloads, screenshots, or temporary files. Existing trailing blank lines in the reviewed HTML were retained to preserve source bytes; the staged whitespace check passed with only that existing blank-at-EOF condition excluded.

The exact staged deployment procedure and required settings are in [docs/STAGING.md](../docs/STAGING.md), with links to current official Vercel documentation. Local preparation is ready for an owner-approved Preview. Before that action, select the Vercel account/team, project, and reviewer access settings. The Vercel CLI is not installed here, and no account/project has been configured. Hosted routing, protection, and caching remain unverified because deployment is explicitly out of scope.

Before public publication, confirm the real ordering destination or deliberately retain Coming soon, the printed author-name order, venue, start time, and RSVP details. Also resolve the cold mobile image-loading concern to the owner's accepted target, and complete desired physical-device, Safari, and screen-reader review. No pending business information was invented during this milestone.

Useful reproduction commands after starting the packaged preview and pointing `QA_URL` at it:

```powershell
node qa/check-static-build.cjs
node qa/verify.cjs
node qa/interaction-checks.cjs
node qa/focus-contrast.cjs
node qa/mobile-performance.cjs
```

The browser checks use an existing Playwright installation via `PLAYWRIGHT_MODULE` and a matching browser via `BROWSER_PATH`. Set `AXE_SCRIPT` to an existing axe-core script before the extended scan; focus inspection requires that scan's current report and Python/Pillow. The build check additionally accepts `AJV_MODULE`, `VERCEL_SCHEMA`, and `IGNORE_MODULE` to repeat schema-property and CLI-ignore validation. Those tools were already present outside this project; none was installed as a website dependency. Set `QA_BROWSER=firefox` with the matching Firefox executable for the extended Firefox run. Clear that override for Chromium-based checks.
