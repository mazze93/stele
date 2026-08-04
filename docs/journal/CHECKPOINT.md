# CHECKPOINT

**Last updated:** 2026-08-04 · Phases 0–5 complete, cloud review folded in,
both branches pushed and open as PRs #44 (session) and #43 (lint + stele-core CI)

## Phases

- [x] Phase 0 — journal scaffold, assumption check, review re-verification
- [x] Phase 1 — CLAUDE.md reconciliation (items 1, 3–6, 8–9)
- [x] Phase 2 — stele-core `/api/*` bearer auth + loopback bind (probed: 401
      unauthenticated, 500 fail-closed unconfigured, loopback-only socket)
- [x] Phase 3 — review triage: server-side chain + `/verify` route, strict
      `extractJson` + 14 new tests, `.claude/settings.local.json` untracked,
      session-start hook narrowed to `--frozen-lockfile --ignore-scripts`
  - [ ] **carried over:** audit-write serialization + honest `auditCount` in
        `App.tsx` (the counter drift recorded in DECISIONS) — untouched
  - [ ] **carried over:** hard-coded operator machine profile in `compiler.ts`
        (lines 278, 292–297, 319) — needs a decision on runtime-profile shape
  - [x] ~~`stele-core` is not covered by CI typecheck~~ — done on
        `chore/lint-green-and-stele-core-ci` (PR #43); job verified green in
        GitHub's environment. It still has no suite of its own, only `tsc`.
- [x] Phase 4 — eval harness: deterministic gate (in `pnpm test`) +
      opt-in live tier; mutation-tested
- [x] Phase 5 — scoped as ADR-0004 (extraction trust boundary) and
      ADR-0005 (ecosystem position, envelope-before-CLI); README gains a
      Known limits section rather than implying a closed perimeter

## To resume

Read `CHECKPOINT.md` → `PLAN.md` → `DECISIONS.md`, then start at the first
unchecked phase. `DECISIONS.md` already records which Repository Review findings
were verified against source and which are stale — do not re-derive them.

## Deferred / needs the user

- ~~Dependency install~~ — done. `npx pnpm@10 install --frozen-lockfile` at the
  root, `npm install` in `stele-core`; npm 11 declined the four postinstall
  scripts on its own and `prisma generate` was run explicitly.
- **Version drift** — `package.json` says `1.1.0`, `src/lib/version.ts` says
  `1.0.0`, and the latter stamps `steleVersion` into narrative exports. Needs a
  decision on which is authoritative before either is edited.
- **Deploy shape** — root `wrangler.toml` declares
  `pages_build_output_dir = "dist"`; `site/README.md` documents direct upload of
  `site/deploy`. One is stale.
- ~~CLI plugin hint~~ — resolved as ADR-0005: the ecosystem surface is an
  *envelope*, not a command, and a CLI is inherited from the stratum /
  adaptive-response integration rather than authored standalone. The
  `claude-code-hint` line is sequenced last, after a plugin exists to announce.
- **Blog post corrections** — `stele-blog-post.md` in ProtonDrive has seven
  verified factual errors (wrong integrity states, wrong audit-hash claim, wrong
  type shapes). Not yet applied; awaiting choice of edit-in-place vs diff.

## Also found, not fixed

- ~~**`pnpm lint` is red on `main`**~~ — fixed on
  `chore/lint-green-and-stele-core-ci` (PR #43): zero errors, and `pnpm lint`
  is now a CI step so it cannot rot again unnoticed. `react-hooks/refs` is
  deliberately `warn`, not `off` — it is the audit-counter drift below, and
  silencing it would turn a known defect into a green check. Restore to
  `error` when `App.tsx` stops reading the ref during render.
- **The blog post** (`stele-blog-post.md`, ProtonDrive) still carries seven
  verified factual errors, including the wrong integrity states. ADR-0005 was
  written against the corrected framing; the post itself is untouched.

## Push queue

Branch `session/2026-08-04-perimeter-and-reconciliation`, cut from `3c22293`,
pushed through Phase 5. No PR opened — that is the user's call.
