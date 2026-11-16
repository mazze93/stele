# Release candidate v1.3.0

## Recoverable state

Branch: `codex/replay-and-ui-alignment`.
Replay milestone: e50d962 (pushed). UI milestone follows on the same branch.
Base: 0d6f272. No production deployment is inferred from local checks.

Completed: caller-pinned replay snapshots, independent scope witnesses, seventh
counterexample fixture, replay regressions in CI; session overview; user-mode
fork/edit/select/delete/export; local chain check/export; current capability flags;
responsive tablet/mobile navigation; removal of resolved project questions.

Preserved limits: synthetic candidates only, shared Node/host, trusted output
parent, external pin approval required, session-only user modes, no remote audit
delivery guarantee. EPOCHÉ retains its single reset path.

## Evidence before publication

- Existing baseline: typecheck, lint, 149 tests passed.
- Eight Node evidence/replay tests passed; all seven experiment decisions agree.
- Refreshed archive: 110 manifest entries verified.
- Browser smoke: desktop and 390px mobile passed mode creation/edit/delete,
  built-in protection, audit consistency check, JSON export; no page exceptions.
- Initial final-check attempt hit pnpm's default home path outside the writable
  workspace after the version bump. Re-running installation/check/build with
  XDG_DATA_HOME, XDG_CACHE_HOME and PNPM_HOME under /workspace succeeded; no
  product or release gate was disabled. The lockfile remains unchanged.

## Final gates and handoff

Before merge, run against the final UI commit:

```sh
export XDG_DATA_HOME=/workspace/work/pnpm-data XDG_CACHE_HOME=/workspace/work/pnpm-cache PNPM_HOME=/workspace/work/pnpm-home
pnpm check
pnpm build
node --test evals/assurance-integrity/evidence.test.mjs evals/assurance-integrity/replay.test.mjs
node docs/research/ui-alignment/browser-smoke.cjs
```

The browser command requires a running app (default http://localhost:5173/) and
Playwright/system Chromium. The hosted production build additionally uses the
public VITE_STELE_CORE_URL through site/assemble.zsh. Deployment requires main's
checks, then the deploy-site workflow and post-deploy browser verification.
Deployment IDs and final outcomes belong in a follow-up entry below.
