The approved four-page site is prepared for a Vercel **Preview** deployment. No Vercel project has been created or linked, and no deployment or remote Git push has been performed. The commands in the deployment procedure below are documentation for a later, explicitly approved action.

Local preparation is independent of Vercel:

```powershell
Set-Location C:\dev\book-launch-site
node scripts/build-static.cjs
$env:PORT = '8081'
node qa/serve-built.cjs
```

The build copies the 12 files listed in `scripts/static-files.json` into `dist/` without changing their bytes. No compiler, bundler, image conversion, package installation, or server-side runtime is involved. The local preview applies the configured browser cache header and ETags for conditional-request tests; it does not emulate Vercel routing, authentication, or its CDN.

Use these project settings when the owner has approved the Vercel account/team and project:

| Setting | Value |
| --- | --- |
| Root directory | Repository root, containing `vercel.json` |
| Framework preset | Other (`framework: null`) |
| Node.js version for the copy step | 22.x; local verification used Node 22.23.1 |
| Install command | Empty string; installation skipped |
| Build command | `node scripts/build-static.cjs` |
| Output directory | `dist` |
| Environment variables | None required by the website or build |
| URL behaviour | Preserve `.html` links; `cleanUrls: false`, `trailingSlash: false` |
| Functions / image optimization service / analytics | None configured |

The file-based build settings follow [Vercel's configuration documentation](https://vercel.com/docs/project-configuration/vercel-json). Node 22.x is listed in the [supported build image](https://vercel.com/docs/builds/build-image). The configured properties were checked against the corresponding properties of Vercel's published schema. An actual Vercel build remains unverified until an approved Preview deployment is made.

The public routes are `/`, `/book.html`, `/author.html`, and `/launch.html`. There is no SPA fallback or rewrite to Home. Unknown paths should return 404. Development reports, scripts, configuration, Git metadata, archived PNG alternatives, and unused TTF files are absent from `dist/`. The [CLI upload allowlist](https://vercel.com/docs/deployments/vercel-ignore) also excludes them from CLI source uploads. Original assets remain in the local Git baseline for provenance.

Browser cache policy is `public, max-age=0, must-revalidate`. Filenames are not content-hashed, so a year-long immutable cache would risk stale styles, copy, or the final cover when pending information changes. Conditional ETag requests reuse unchanged bodies locally. Vercel separately caches static files for the deployment's lifetime on its CDN; confirm real response headers after deployment. See [Vercel's static caching documentation](https://vercel.com/docs/caching/cdn-cache) and [cache header guidance](https://vercel.com/docs/caching/cache-control-headers). No service worker or custom cache invalidation mechanism is present.

After explicit staging deployment approval:

1. Confirm the approved Vercel account/team slug and project name. Confirm who must be able to open the Preview and select the project's Preview protection settings accordingly. Do not connect Git for automatic deployment as part of this CLI staging procedure.
2. Verify the reviewed local revision and artifact:

   ```powershell
   git status --short
   git log -1 --oneline
   node scripts/build-static.cjs
   ```

   Stop if tracked files have changed unexpectedly. The build output and local QA screenshots are intentionally ignored by Git.
3. Use an existing Vercel CLI, or install it only when the owner has approved proceeding. Record its version:

   ```powershell
   npm install --global vercel
   vercel --version
   vercel login
   ```

   Skip installation if a suitable CLI is already available. Complete browser authentication; do not put credentials into project files or chat.
4. Link the owner-selected project from the repository root:

   ```powershell
   $vercelScope = '<approved-account-or-team-slug>'
   $vercelProject = '<approved-project-name>'
   vercel link --scope $vercelScope --project $vercelProject
   ```

   Review the prompts and verify the linked project and the settings above. Creating or linking a project is a future owner-approved configuration action. `.vercel/` is ignored and must not be committed.
5. Create a Preview explicitly:

   ```powershell
   vercel deploy --target=preview --scope $vercelScope
   ```

   This follows the documented [deployment target option](https://vercel.com/docs/cli/deploy). Record the returned deployment URL and verify that the dashboard labels the target **Preview**. Do not use `--prod`, `--temporary`, production promotion, aliases, custom domains, or a remote push in this procedure.
6. On that exact Preview URL, check all four routes directly, then navigate among them. Verify Coming soon, active links, keyboard focus, Escape, outside dismissal, focus return, images, fonts, and no overflow on a phone and desktop. Inspect browser Network headers for cache behaviour and confirm `/qa/verify.cjs`, `/README.md`, `/vercel.json`, and `/assets/images/author-portrait.png` return 404.
7. If Preview protection permits an approved automated access path, rerun the existing browser checks with `QA_URL` set to the Preview URL. Otherwise use the authorized owner browser; a protection redirect or access-denied response is an access boundary, not evidence that page routing failed. Do not disable protection or introduce a bypass automatically.

The present milestone stops before step 1's external account/project configuration. There is no hosted acceptance result yet. Cold mobile image transfer remains a performance consideration documented in the readiness report; no original asset was modified or recompressed during this preparation.

Before public launch, confirm the real acquisition destination or retain Coming soon deliberately, the printed author-name order, venue, start time, and RSVP arrangements. The current approved copy and pending wording are unchanged. Production publication requires separate approval.
