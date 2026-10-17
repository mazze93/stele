# stele.mazzeleczzare.com

Landing page + hosted app for STELE, served from the `stele` Cloudflare
Pages project (direct upload — not git-connected).

- `public/` — the landing page source (self-hosted fonts, no third-party requests)
- `deploy/` is assembled at deploy time and not committed

Deploy:

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
