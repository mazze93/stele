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

---

<!-- Appended 2026-09-19. CHECKPOINT.md is marked -merge in .gitattributes
     because it is a projection that gets rewritten, not a ledger. This is a
     NEW dated section rather than a rewrite of the two above: the Glimmer
     phases are paused (blocker changed shape — see DECISIONS 2026-09-19),
     and overwriting them would erase a pause that still needs a decision. -->

## Checkpoint

**Last updated:** 2026-09-19 · v1.1.2 released; class-closure thread opened
at Phase 0

### Shipped this session

- Reconciled `main` (was 11 commits behind), pruned 7 stale remote-tracking
  refs, removed a dead worktree, deleted 4 fully-merged local branches
- Merged #66 (hono 4.13.7 — XSS + path traversal + DoS advisories), #52
  (workflow least-privilege permissions), #69, #71
- Merged #72 — CI typecheck fix, the first run in this repo's history that
  actually typechecked `src/`
- Tagged and released **v1.1.2**; `bundle.html` 428,309 bytes attached

### Current thread — Unicode format-character evasion

- [x] **Phase 0** — journal scaffold, stage 1 exploit in the real execution
      path, policy stated in English
- [ ] **Phase 1** — ADR-0006 (the fold policy and its explicit non-coverage)
- [ ] **Phase 2** — `src/lib/fold.ts`, leaf module, wired into the scanner
- [ ] **Phase 3** — generated mutation corpus as executable invariant
- [x] **Phase 4** — build gate against raw-input matching in detection
- [x] **Phase 5** — enforcement-boundary evidence (escalate + appendEntry)
- [x] **Phase 6** — publish the remaining perimeter in README

### To resume

Read `CHECKPOINT.md` → `PLAN.md` → `DECISIONS.md`, then start at Phase 1.
The exploit is already established and the policy already stated — do not
re-derive either. `DECISIONS.md` 2026-09-19 records the probe's own blind
spot (NARIKIRI-002); do not mistake it for coverage.

### Open PRs, triaged not merged

- **#70** react-day-picker 9→10 — **breaks the build**, verified locally:
  v10 drops the `table` key from `ClassNames`, so `calendar.tsx:85` fails
  `tsc -b` with TS2353. Reported `mergeableState: clean` because CI was not
  typechecking. Real choice: update the vendored component, or delete it —
  `calendar.tsx` is imported by nothing.
- **#68** dev-tools ×10 — contains **vitest 4 → 5**, a major, unprobed. The
  suite is the security gate; this needs a local run before merging.
- **#55** react 19.2.5 → 19.2.8 + @types/react — patch bumps only. Safe.
  (Earlier in the session this was called a major. That was wrong.)

All three also revert react-slot and react-resizable-panels and need a
`@dependabot rebase` before they are mergeable as-is.

### Deferred / needs the user

- **Ollama is gone** — `/Applications/Ollama.app` is an empty directory,
  `/usr/local/bin/ollama` dangles. Reinstall is a user decision; Glimmer
  Phases 1–2 can proceed without it, 3+ cannot.
- **Version drift** — resolved. `version.ts` derives from `package.json`
  via vite `define` (#57). Both now read 1.1.2.
- **Deploy shape** — still unresolved. Root `wrangler.toml` declares
  `pages_build_output_dir = "dist"`; `site/README.md` documents direct
  upload of `site/deploy`. One is stale. Untouched this session.
- **Blog post corrections** — `stele-blog-post.md` in ProtonDrive, seven
  verified factual errors. Still not applied.
- **`projects.ts` self-entry is stale** — see the next section.

### Found, not fixed — STELE's model of itself has drifted

STELE governs projects from `src/data/projects.ts`. Its own entry
(`id: 'directive-remixer'`) is stale in the same way the `secure-pride`
entry was before #67 corrected it:

- `root: '~/dev/stele'` — actual root is `~/Projects/tools/stele`. Exactly
  the defect class #67 fixed for secure-pride (`~/dev/secure-pride`).
- `stack` omits Tailwind v4, Radix/shadcn, zod, and all of `stele-core`
  (Hono + Prisma).
- openQuestion "bundle.html: vite-plugin-singlefile not yet wired" — it is
  wired, `vite.config.ts:3,15`. Verifiably false.
- Tessera T-009 is marked RESOLVED inline but still listed.
- **T-010 is a live defect that CLAUDE.md retired on a wrong basis.**
  CLAUDE.md retires it as referencing `src/policy/resolve.ts`, which does
  not exist in this repo. But the T-010 in `projects.ts` points at
  `src/lib/types.ts`, which does exist — and the inconsistency is still
  there: `types.ts:37` declares `tesserae: Tessera[]` (required) while
  `compiler.ts:105` uses `?? []` and `compiler.ts:455` uses
  `p.tesserae?.length`. The retirement note closed a different ticket.

The dogfooding question this came from is worth keeping in view: STELE
compiles governance for seven projects and is the eighth, but nothing in
the build regenerates or checks its own entry, and `stele-core`'s audit
ledger has still never taken real traffic.


---

<!-- Appended 2026-09-19, second entry of the day. Phases 0-6 of the
     class-closure thread are complete; this records where it stops. -->

## Checkpoint

**Last updated:** 2026-09-19 · class-closure thread complete, phases 0–6

### Closed

- ADR-0006 filed; detection reads raw OR fold at `runScan()`
- Generated invariant over every runtime category-Cf code point
- `evals/eval.test.ts` gates the primitive: one evaluation site, both views,
  no global patterns, no escalation logic in `App.tsx`
- `src/lib/enforcement.ts` extracted; enforcement asserted directly
- README "Known limits" separates demonstrated closure from open classes

95 tests across 9 files. `tsc -b` clean. Build clean.

### Open, pinned, not fixed

Each has a quarantine test that fails if it silently starts passing:

- **Intra-word separators** — `ig nore previous` evades. NFKC maps U+00A0 to
  a plain space, so NBSP folds *into* this class rather than out of it.
  Closing it means tolerating a separator inside keywords, which trades
  against the false-positive discipline ADR-0002 rests on. Needs its own
  decision and its own corpus.
- **Visual homoglyphs** — `ign<U+043E>re` with Cyrillic o. Distinct NFKC
  forms; the fold is a no-op by construction.
- **Encoded payload differentials** — TW-007 fires low-confidence on a base64
  block, but nothing decodes it. Signal, not coverage.

### Carried over, still untouched

- `App.tsx` reads `auditTrailRef` during render — why `react-hooks/refs` is
  `warn` and not `error`. Phase 5 fixed the stale-counter half by calling
  `setAuditCount()` after enforcement; the render-read half remains.
- Hard-coded operator machine profile in `compiler.ts:278,292–297,319`.
- `src/data/projects.ts` self-entry is stale — wrong root, incomplete stack,
  a resolved openQuestion, and a live T-010 that `CLAUDE.md` retired against
  a file that never existed in this repo.
- Deploy shape: root `wrangler.toml` vs `site/README.md`. One is stale.
- Ollama is gone; Muse Glimmer blocked past phase 2.
