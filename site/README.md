# stele.mazzeleczzare.com

Landing page + hosted app for STELE, served from the `stele` Cloudflare
Pages project (direct upload — not git-connected).

- `public/` — the landing page source (self-hosted fonts, no third-party requests)
- `deploy/` is assembled at deploy time and not committed

Deploy:

```bash
pnpm build                                   # app -> dist/bundle.html
rm -rf site/deploy && mkdir -p site/deploy/app
cp -r site/public/. site/deploy/             # landing at /
cp dist/bundle.html site/deploy/app/index.html
cp dist/favicon.svg dist/icons.svg site/deploy/app/
npx wrangler pages deploy site/deploy --project-name=stele --branch=main
```

Routes: `/` landing (primary CTA → `/app/`), `/app/` the compiler.
