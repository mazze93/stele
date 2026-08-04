# CHECKPOINT

**Last updated:** 2026-08-04 · Phases 0–5 complete and pushed

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
  - [ ] **carried over:** `stele-core` is not covered by CI typecheck; it had
        two live type errors before this session and no suite of its own
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

- **`pnpm lint` is red on `main`** — 14 errors across `App.tsx`, six
  `components/ui/*` files, `hooks/*`, `audit.ts:84`, `tripwires.ts:108`. None
  in files this branch touched. CI runs `tsc` and `vitest` but never `eslint`,
  which is why nobody noticed.
- **The blog post** (`stele-blog-post.md`, ProtonDrive) still carries seven
  verified factual errors, including the wrong integrity states. ADR-0005 was
  written against the corrected framing; the post itself is untouched.

## Push queue

Branch `session/2026-08-04-perimeter-and-reconciliation`, cut from `3c22293`,
pushed through Phase 5. No PR opened — that is the user's call.
