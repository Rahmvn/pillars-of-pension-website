# Production publication

Published on 2 November 2026 after the owner explicitly changed the requested
target from Preview to **Production**. This report concerns the real hosted
site, in addition to the earlier local implementation and image tests.

- Public URL: https://pillars-of-pension-website.vercel.app
- Immutable deployment URL: https://pillars-of-pension-website-7cpd7by25-rahmvns-projects.vercel.app
- Vercel project: `rahmvns-projects/pillars-of-pension-website`
- Deployment ID: `dpl_FHgYCGErptUunV7cY6vvpmHajdA3`
- Verified API state: `READY`, target `production`, source `cli`.
- Deployed source commit: `ec94964c133f8de8dd0f6702606cf959fa535ca0`.
- GitHub: https://github.com/Rahmvn/pillars-of-pension-website

Git integration is disconnected. No automatic deployment on push was enabled.
Sign-in protection is disabled for this project at the owner's request. Both
URLs were verified without credentials or an authentication bypass. Only the
new pension website project was created/configured; other Vercel projects were
not modified. No custom domain or paid service was configured.

## Git and packaging

The GitHub repository had no remote refs when fetched, so no unrelated-history
merge was required. `origin` points to the supplied repository. Baseline commit
`0a830f2` remains an ancestor of `main`. Image optimization was committed as
`4e131f0`; the necessary CLI upload correction was committed as `ec94964`.
Pushes used ordinary fast-forward updates with no force option. The fetched
remote tree and commit matched the local source.

The actual Vercel CLI dry run revealed that directory re-inclusion patterns
with trailing slashes excluded the asset and build-script directories. Removing
those trailing slashes fixed CLI traversal without changing the website.
The corrected dry run included exactly 19 source inputs: 16 runtime files plus
`vercel.json`, the build script and its manifest. See
[vercel-upload-results.json](vercel-upload-results.json). The earlier local
ignore-library check alone had not detected this CLI-specific behaviour.

The static build uses Node 22.x and `node scripts/build-static.cjs`, with `dist`
as output. No framework, backend, runtime dependencies or environment variables
are needed. The original Figma exports remain unchanged in Git. Screenshots,
experiment fixtures, rejected image candidates, `dist`, local link metadata,
and the CLI-generated `.env.local` are ignored and were excluded from upload.
The CLI credential store and tokens were not committed or reported.

## Hosted verification

Checks ran against the public Production URL using Chromium 147.0.7727.15,
without bypass tokens or ignored TLS errors. The compact machine-readable
evidence is [hosted-production-results.json](hosted-production-results.json).

- Home `/`, Book `/book.html`, Author `/author.html`, and Launch `/launch.html`
  load directly and through the shared navigation.
- All 24 page/width combinations passed at 320, 375, 390, 430, 768 and 1440 px.
  All 52 additional intermediate layouts passed. No horizontal overflow,
  missing images, browser errors or failing page/resource responses were found.
- All 32 source/destination navigation pairs passed on mobile and desktop.
  Active-page clicks avoid reloading. Mobile menu opening/closing, focus trap,
  Escape, outside dismissal and focus return passed in the six-width checks.
- Keyboard skip link, visible focus, Enter activation, Back/Forward history,
  short-height menu scrolling, reduced motion and no-JavaScript page navigation
  passed. One separate breakpoint focus handoff issue remains, detailed below.
- Get the Book still changes to Coming soon with a status announcement and no
  geometry change or invented ordering destination.
- Twelve axe scans produced zero violations. Five scan entries covering 25
  text nodes were inconclusive about colour contrast because of overlapping or
  pseudo-element backgrounds. All 25 passed separate painted inspection.
  All 85 painted keyboard-focus states passed, with minimum adjacent contrast
  6.856:1, exceeding the required 3:1.
- All 16 runtime responses matched their local source SHA-256 hashes and byte
  lengths. AVIF/WebP, the original cover and Geist WOFF2 loaded with appropriate
  MIME types. Geist reported loaded in browser FontFace checks on all four
  pages at mobile and desktop sizes. Visible images decoded at native sizes;
  placeholders were confined to CSS-hidden layers.
- All 24 hosted screenshots were compared with the verified local optimized
  captures. Eight were pixel-identical; worst whole-page mean absolute error
  was 0.1277/255 and maximum individual channel error was 18. No material visual
  discrepancy was found. Home mobile/desktop, portrait and Launch tablet
  screenshots were also visually inspected.
- HTTP redirects to HTTPS with status 308. HTTPS used a valid `*.vercel.app`
  certificate and TLS 1.3. HSTS was present. Neither public URL required sign-in.
- All runtime responses used `Cache-Control: public, max-age=0, must-revalidate`
  and ETags. All 16 conditional requests returned 304. Repeated CDN requests
  returned `x-vercel-cache: HIT`, including assets initially reported as MISS.
- Development paths, configuration, Git metadata, `.env.local`, an unused
  original PNG alternative and an unknown route returned 404.

The original extended navigation script stopped at its strict breakpoint-focus
assertion. A diagnostic copy recorded that confirmed failure separately and
then ran all remaining assertions, including accessibility and no-JavaScript
checks. The deployed script and original test source were not altered to make
the assertion pass. The complete extended suite must therefore be described
as having one known failure, rather than as a clean pass.

## Remaining genuine issues

**Navigation bootstrap layout shift reproduces on the hosted site.** Three
cold/warm pairs per page used the previous 390 x 844, DPR 1 mobile profile:
1.6 Mbps download, 0.75 Mbps upload, 150 ms latency and 4x CPU slowdown.
These were diagnostic lab runs, concurrent with other browser checks, not a
new performance benchmark or physical-device/field evidence.

| Page | Cold CLS in three runs | Warm CLS in three runs |
| --- | --- | --- |
| Home | 0 / 0 / 0 | 0.473934 / 0.473934 / 0.473934 |
| Book | 0 / 0 / 0 | 0.473934 / 0.473934 / 0.473934 |
| Author | 0 / 0.473934 / 0 | 0 / 0.473934 / 0 |
| Launch | 0 / 0 / 0.003233 | 0.473934 / 0.473934 / 0 |

This is not limited to warm loading in the hosted environment. The traces
again point to the existing no-JavaScript-to-JavaScript navigation bootstrap.
No layout or navigation code was changed during publication.

**Open-menu mobile-to-desktop resize can lose keyboard focus.** In a targeted
ten-iteration Chromium test, eight transitions left focus on the page body
instead of the active desktop navigation link, even after a one-second wait.
The menu closed and page inertness cleared; ordinary navigation, Escape and
outside dismissal worked. The browser can hide/blur the mobile toggle before
the existing media-query handler checks whether focus was in the header.
This edge case remains unfixed and should receive a focused accessibility
follow-up rather than being concealed by the other passing checks.

The acquisition destination, printed author-name order, venue, start time and
RSVP arrangements still need owner confirmation. Coming soon and the approved
pending wording remain intact. The confirmed launch remains 9 November 2026,
Lagos, Nigeria.

## Evidence and future operation

Commands used included `git fetch origin`, ordinary `git push origin main`,
`vercel link --scope rahmvns-projects --project pillars-of-pension-website`,
`vercel deploy --dry --json --environment production --scope rahmvns-projects`,
and `vercel deploy --environment production --scope rahmvns-projects`.
Vercel CLI version was 65.9.0. Project/deployment API reads confirmed the account,
project, target, source commit, public access and absence of a Git link.

Existing `qa/verify.cjs`, `qa/interaction-checks.cjs`, `qa/focus-contrast.cjs` and
`qa/image-waterfall.cjs` were used against the hosted URL. Browser captures,
raw API replies, diagnostic copies and detailed traces remain in ignored
`qa/artifacts/hosted-production/` and `qa/artifacts/vercel-*.json`.
The public report/compact results contain no credentials or temporary images.

Documentation and verification evidence committed after publication do not
change the deployed runtime. Future Git pushes alone will not publish changes;
another explicit CLI deployment is needed. See [STAGING.md](../docs/STAGING.md)
for the static project settings and a future Preview procedure.
