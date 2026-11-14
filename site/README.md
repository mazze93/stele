# stele.mazzeleczzare.com

Landing page + hosted app for STELE, served from the `stele` Cloudflare
Pages project (direct upload — not git-connected).

- `public/` — the landing page source (self-hosted fonts, no third-party requests)
- `public/_headers` — security headers and cache lifetimes (Pages reads it from the upload)
- `public/404.html` — real 404s; without it Pages answers unknown paths with the landing page
- `public/robots.txt`, `public/sitemap.xml` — crawl hints
- `deploy/` is assembled at deploy time and not committed

Font files are named with a content hash (`cinzel-wght.ef95296c.woff2`) because
`_headers` caches them as immutable. Replace a font by adding a new hashed file
and updating the `@font-face` URL and preload in `index.html`.

Cloudflare zone settings live outside this repo. Rocket Loader should be off for
this hostname: it re-defers the walkthrough script, and the landing page's CSP
stays report-only until it is.

Deploy from CI (preferred, once the `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` repository secrets exist): run the `deploy-site`
workflow on `main`. It runs `pnpm check` and the story check, assembles, and
uploads with the commit hash, so the live site always maps to a commit.

Deploy by hand:

```bash
zsh site/assemble.zsh
npm exec --prefix stele-core --no -- wrangler pages deploy site/deploy --project-name=stele --branch=main --commit-hash="$(git rev-parse HEAD)"
```

Routes: `/` landing (primary CTA → `/app/`), `/app/` the compiler.


The root Wrangler output directory is `site/deploy`, matching this assembly.
Hosted builds explicitly enable the public core origin. Plain `pnpm build`
leaves the downloaded/offline bundle's mirror disabled unless configured.
Deploy only a tested committed revision; inspect the active deployment and
exercise the production app and core after upload. Worker rollback does not
reverse database writes. Prior deployment IDs are recorded in release evidence.
