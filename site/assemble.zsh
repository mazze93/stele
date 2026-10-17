#!/bin/zsh
set -euo pipefail
cd "${0:A:h:h}"
# Public service origin only. No administrator or model credential in the bundle.
VITE_STELE_CORE_URL=https://stele-core.mazzewhiteley93.workers.dev pnpm build
mkdir -p site/deploy/app
cp -R site/public/. site/deploy/
cp dist/bundle.html site/deploy/app/index.html
cp dist/favicon.svg dist/icons.svg site/deploy/app/
