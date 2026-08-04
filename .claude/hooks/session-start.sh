#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# --frozen-lockfile: install exactly what pnpm-lock.yaml pins, and fail rather
# than resolve anything new. An unpinned install at session start is a
# supply-chain decision made by whoever last touched a manifest.
#
# --ignore-scripts: lifecycle scripts run arbitrary code from every transitive
# dependency before a single line of this project executes. A remote review
# session needs the tree on disk, not postinstall side effects. If a build here
# ever genuinely needs them, run the approval explicitly rather than widening
# this default.
pnpm install --frozen-lockfile --ignore-scripts
