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

---

<!-- Merged 2026-09-07 while rebasing 3 local commits onto 20 upstream ones.
     The section below was authored on the divergent local branch (2026-08-13,
     Muse Glimmer session) and is preserved verbatim with its H1 demoted to H2.
     CHECKPOINT.md is marked -merge in .gitattributes precisely so that this
     stayed a human decision rather than a silent union. -->

## Checkpoint

Last updated: 2026-08-13 21:50 EDT

## Phases
- [ ] 1. Provenance research (model card, checksums, license, Ollama
      registry vs. manual import, fine-tuned variant survey)
- [ ] 2. Decision — file ADR-0004
- [ ] 3. Pull + record provenance (first hard-to-reverse step: bandwidth/disk)
- [ ] 4. Hardware baseline (idle + under-load RAM/CPU on this machine)
- [ ] 5. Versioned eval harness (prompts + quantifiable tests, checked in)
- [ ] 6. Stele integration (audit-logging wrapper → stele-core session/event API)
- [ ] 7. `/security-review` on everything added in 3–6
- [ ] 8. Resume paused secure-pride consolidation strategy

## To resume
Read this file, then `PLAN.md`, then `DECISIONS.md`, then continue at the
first unchecked phase.

## Deferred / needs user
- Final go on which specific model/variant to pull (Phase 2 output)
- Confirm `stele-core`'s DATABASE_URL points at a local/dev Postgres before
  Phase 6 generates real audit traffic against it
- Whether Glimmer replaces or supplements `gemma4`/`llama3.1:8b` for
  existing local-swarm use, once Phase 5's numbers exist
