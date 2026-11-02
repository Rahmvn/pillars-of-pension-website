# Cold-mobile image optimization

Verified locally on 2 November 2026 against baseline commit
`0a830f274dd1872eb97e3ae34103a75f736caedd`. No deployment, push, publication,
or new Git commit was performed. The baseline remains available in Git; the
optimization is a reviewable working-tree change.

## Findings and accepted change

The Home LCP element was the mobile `.stone-scene` image, not the cover. The
Author LCP element was the portrait. Baseline image requests began around
240 ms, but the 1,122,296-byte lossless interior and 1,167,366-byte lossless
portrait dominated the constrained connection. On Author they competed at
High priority; the portrait completed around 12.2 seconds. On Home the
interior completed around 6.7 seconds. Changing priorities alone produced
Home 6.760 s and Author 12.272 s in an exploratory run, without a useful gain.
Book's LCP was a reading paragraph; Launch's was the `09` date text.

Four native-resolution delivery derivatives were accepted:

| Delivery asset | Dimensions | Encoding | File bytes |
| --- | --- | --- | ---: |
| `assets/images/delivery/interior-1536.avif` | 1536 x 1024 | AVIF quality 90 | 143,867 |
| `assets/images/delivery/interior-1536.webp` | 1536 x 1024 | WebP quality 95 | 158,172 |
| `assets/images/delivery/author-1153.avif` | 1153 x 1364 | AVIF quality 90 | 240,059 |
| `assets/images/delivery/author-1153.webp` | 1153 x 1364 | WebP quality 95 | 292,024 |

They were encoded directly from the original Figma exports using Pillow
12.2.0, libavif 1.4.1 and libwebp 1.6.0. AVIF uses 4:4:4 chroma, full range,
speed 5 and two encoding threads; WebP uses method 6. Both include an sRGB
ICC profile. Encoding is an offline development step, not part of the build.
Hashes, source hashes and settings are in [image-delivery-assets.json](image-delivery-assets.json).

All original Figma exports, previous lossless WebP files, fonts, and the SVG
contact shadow remain unchanged locally. The original 76,858-byte book cover
is served unchanged. Source hashes are verified in
[image-optimization-results.json](image-optimization-results.json).

All four pages use `picture` sources: AVIF, quality-95 WebP, then the original
lossless WebP fallback. The only CSS addition is `display: contents` for these
wrappers. Existing dimensions, masks, cropping, placement, typography, colours,
copy, links and Coming soon behaviour are preserved. Above-the-fold images
are not lazy-loaded; the Home stone and Author portrait have High fetch
priority. No extra preload is added because these sources are directly
discoverable in HTML.

A transparent data-URI source avoids downloading an already CSS-hidden layer:
Home's desktop scene below 1100 px, its mobile scene from 1100 px, and Author's
background from 1100 px. It never replaces a visible image. Source selection
and resizing across both sides of the breakpoint were verified in Chromium
and Firefox, at DPR 1 and 2.

## Candidate and quality evaluation

[image-candidate-results.json](image-candidate-results.json) records 45
encodings: AVIF quality 80/90/95 and WebP quality 90/95, across interior widths
1536/1280/1024, portrait widths 1153/960/768/640, and cover widths 480/360.
Browser trials included native AVIF 90/95, responsive AVIF 90, native WebP 95,
cover alternatives, and priority-only changes. Not every encoding was used
in a full page performance trial.

The smaller responsive trial was faster (single-run Home 1.520 s, Author
2.208 s), but reduced portrait detail and background edge quality did not
justify shipping it. Native AVIF 95 was heavier (Home 2.496 s, Author 3.848 s
in its exploratory run) without a visible benefit over native quality 90.
Cover alternatives offered little useful saving or changed fine gold lettering
and blue detail, so the original cover was retained.

Fresh baseline browser screenshots were captured from the baseline commit.
AVIF and the exact production WebP fallback were compared with that baseline
at 320, 375, 390, 430, 768 and 1440 px, plus 390/768/1440 px at DPR 2: **72
page comparisons**. Text, metadata, navigation targets/current page, alt text,
element geometry, fonts, colours, object fitting/position and masks matched.

Actual-size inspection covered the face, skin, suit fabric, warm wall
gradients, stone grain and gold cover on mobile and desktop, including DPR 2
portrait crops. No visible softness, banding or colour cast was found in the
accepted assets. These are lossy encodings, so decoded pixels are not
identical. Across full screenshots, the worst mean absolute channel error
was 0.5353/255 and the lowest mean local luminance SSIM was 0.996525. These
supplement human inspection; they do not prove universal perceptual identity.
See [image-visual-results.json](image-visual-results.json). Captures, image
diffs and rejected candidates remain in ignored `qa/artifacts/image-lab/`.

## Repeated before/after performance

Exact previous conditions: Chromium 147.0.7727.15, 390 x 844 viewport, DPR 1,
mobile/touch emulation, 1.6 Mbps download, 0.75 Mbps upload, 150 ms network
latency and 4x CPU slowdown. Each page used a fresh context for cold loading,
then a second navigation to the same URL in that context for warm loading.
The tables show medians of **three cold/warm pairs per page per version**.
These are local lab measurements, not physical-device, CDN or field results.

| Page | Baseline cold LCP | Optimized cold LCP | Baseline resource bytes | Optimized resource bytes | Byte reduction |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home | 6.864 s | 1.900 s | 1,257,136 | 278,748 | 77.83% |
| Book | 1.228 s | 1.140 s | 1,178,956 | 200,568 | 82.99% |
| Author | 12.256 s | 2.704 s | 2,346,622 | 440,927 | 81.21% |
| Launch | 1.224 s | 1.044 s | 1,178,956 | 200,568 | 82.99% |

Resource bytes are the sum of Resource Timing `transferSize` values, including
reported response overhead and excluding the HTML navigation document.
The user-provided earlier Home 6.76 s and Author 12.21 s were reproduced within
normal timing variation; the contemporaneous medians above are the comparison.
Home cold LCP improved 72.32%; Author improved 77.94%.

| Page | Baseline warm LCP | Optimized warm LCP | Warm resource bytes, both versions |
| --- | ---: | ---: | ---: |
| Home | 0.612 s | 0.536 s | 1,800 |
| Book | 0.704 s | 0.528 s | 1,200 |
| Author | 0.780 s | 0.656 s | 1,500 |
| Launch | 0.640 s | 0.556 s | 1,200 |

Cache policy remains `public, max-age=0, must-revalidate`, with conditional
requests returning 304 in the local artifact server. Existing filenames are
not content-addressed, so long immutable caching was not introduced. The
original lossless fallbacks remain packaged for compatibility; supported
browsers request only the selected derivative.

An additional **single-run** test disabled only AVIF selection in an exact
production fixture. WebP fallback cold LCP/resource bytes were Home
1.972 s/293,362; Book 1.168 s/214,873; Author 3.076 s/507,197; Launch
1.104 s/214,873. Warm LCP was respectively 0.732/0.628/0.792/0.552 s.
This confirms a useful fallback improvement but is not a repeated median.

Author remains above 2.5 s in this constrained cold test. Native dimensions
were retained to protect the approved portrait detail. Browser codec support,
device decoding and real network conditions remain sources of variation.

Raw evidence: [baseline waterfall](image-baseline-waterfall.json),
[baseline repeated runs](image-baseline-performance.json),
[optimized repeated runs](image-optimized-performance.json),
[WebP fallback](image-webp-fallback-performance.json), and
[aggregated results](image-optimization-results.json).

## Regression checks and existing limitation

- All 24 page/required-width layout checks passed.
- Chromium and Firefox each passed 52 intermediate layouts and 32 navigation
  pairs, including keyboard/skip links, mobile open/close, outside dismissal,
  Escape/focus return, active pages, breakpoint changes, short viewports,
  reduced motion, history and no-JavaScript page navigation.
- Twelve axe scans had zero violations. Painted focus inspection passed 85
  states; 25 inconclusive text-contrast cases were inspected and passed.
- Each browser passed 64 image/source/resize cases, including 1099/1100 px
  and DPR 1/2. Images decoded; visible sources never selected the placeholder.
- The 16-file artifact passed source-copy, local-route, reference, MIME,
  conditional cache, development-file exclusion and Vercel configuration
  checks. Original image/font hashes and `navigation.js` were unchanged.

**Existing warm-layout issue:** cold CLS was zero throughout both repeated
sets. Warm navigation CLS was 0.4739336493 on every page in both versions.
It must not be reported as a clean CLS result. Additional baseline/optimized
Home traces show the same shift immediately after `navigation.js` adds the
root `.js` class: `.site-shell` changes from y=19 to y=0 and the stone fade
enters the viewport. The existing mobile no-JavaScript header uses relative
positioning and a 400 px flow height before initialization; this transition
is the likely cause. It predates the image changes and needs a separate
navigation-bootstrap fix and regression review. No navigation/layout fix
was introduced in this image-only milestone. Traces:
[baseline](image-layout-diagnostic-baseline.json) and
[optimized](image-layout-diagnostic-optimized.json).

## Files, reproduction and rollback

Runtime changes: four HTML pages, one CSS wrapper rule and the four delivery
assets. Packaging changes: `scripts/static-files.json`, `.vercelignore` and
AVIF MIME support in `qa/serve-built.cjs`. The static verifier now checks image
source references and retains original asset/script hash checks; intentional
HTML/CSS changes are covered by baseline text/geometry comparisons. README
links this report. The existing user edits in `docs/STAGING.md` were preserved;
this milestone changes only the runtime file count from 12 to 16 there.
Useful QA scripts and JSON evidence are retained; screenshots, experiment
sites and rejected derivatives are ignored and excluded from deployment.
Earlier readiness reports remain historical evidence; this report supplies
the current image performance results.

No runtime dependencies were added. Development reproduction uses Python
with Pillow and an existing Playwright installation. Set `PLAYWRIGHT_MODULE`
to its module location and `BROWSER_PATH` to the Chromium executable; Firefox
checks additionally use `QA_BROWSER=firefox`. Existing accessibility scripts
accept `AXE_SCRIPT` pointing to axe-core. See script headers/environment
variables for selecting local modules and output reports.

```powershell
# Terminal 1: reconstruct and serve the unchanged baseline
python qa/image-lab.py
$env:PORT = '8082'
node qa/image-lab-server.cjs

# Terminal 2: build and serve the optimized artifact
node scripts/build-static.cjs
$env:PORT = '8083'
node qa/serve-built.cjs

# Terminal 3: repeated comparison (set local Playwright/browser paths first)
$env:IMAGE_RUNS = '3'
$env:IMAGE_SITE = 'http://127.0.0.1:8082/sites/baseline'
$env:IMAGE_REPORT = 'qa/image-baseline-performance.json'
node qa/image-waterfall.cjs
$env:IMAGE_SITE = 'http://127.0.0.1:8083'
$env:IMAGE_REPORT = 'qa/image-optimized-performance.json'
node qa/image-waterfall.cjs
python qa/summarize-image-optimization.py
```

`python qa/image-candidates.py` regenerates encoding trials inside ignored
artifacts; `python qa/image-lab.py --variants` prepares trial sites.
`python qa/image-lab.py --fallback` prepares the exact production WebP fixture.
`qa/image-visual.cjs` captures a site selected with `IMAGE_SITE`, `IMAGE_LABEL`,
`IMAGE_WIDTHS`, `IMAGE_DPRS` and `IMAGE_PAGES`; `qa/compare-image-visuals.py`
compares the saved baseline/optimized/fallback manifests. `qa/image-selection.cjs`
checks selection/resizing. General accessibility/navigation scripts are
documented in README and the production-readiness report.

To reverse only this milestone's runtime/packaging changes, review the diff,
then use the retained baseline (these commands have **not** been run):

```powershell
git restore --source=0a830f2 -- index.html book.html author.html launch.html styles.css scripts/static-files.json .vercelignore qa/serve-built.cjs qa/check-static-build.cjs
node scripts/build-static.cjs
```

This selective rollback leaves user documentation edits and useful new QA
evidence intact. Unreferenced delivery files need not be deleted for rollback;
the restored packaging manifest excludes them. Do not use a hard reset.

Publishing dependencies are unchanged: acquisition destination, printed
author-name order, venue, start time and RSVP details need confirmation.
The Coming soon action and approved pending wording remain intact. Vercel's
static deployment configuration is prepared, but hosted cache behaviour and
device/field performance have not been tested because deployment is prohibited.
