# CHECKPOINT

**Last updated:** 2026-08-04 · Phase 0 complete, awaiting go-ahead on Phases 2–5

## Phases

- [x] Phase 0 — journal scaffold, assumption check, review re-verification
- [ ] Phase 1 — CLAUDE.md reconciliation (items 1, 3–6, 8–9) — **authorized**
- [ ] Phase 2 — stele-core `/api/*` bearer auth + loopback bind
- [ ] Phase 3 — review triage (server-side hash, audit serialization, strict
      JSON parse, untrack `.claude/settings.local.json`, machine profile)
- [ ] Phase 4 — eval harness + adversarial corpus
- [ ] Phase 5 — adaptive-response routing; CLI plugin hint

## To resume

Read `CHECKPOINT.md` → `PLAN.md` → `DECISIONS.md`, then start at the first
unchecked phase. `DECISIONS.md` already records which Repository Review findings
were verified against source and which are stale — do not re-derive them.

## Deferred / needs the user

- **Dependency install.** No `node_modules` here and no `pnpm` on PATH, so
  nothing can be typechecked or tested in this worktree. The review flags
  install-time supply-chain risk, so this is a call to make deliberately:
  `pnpm install --frozen-lockfile` (optionally `--ignore-scripts`).
- **Version drift** — `package.json` says `1.1.0`, `src/lib/version.ts` says
  `1.0.0`, and the latter stamps `steleVersion` into narrative exports. Needs a
  decision on which is authoritative before either is edited.
- **Deploy shape** — root `wrangler.toml` declares
  `pages_build_output_dir = "dist"`; `site/README.md` documents direct upload of
  `site/deploy`. One is stale.
- **CLI plugin hint** — the requested `cli/index.ts` `claude-code-hint` snippet
  presumes a CLI entrypoint and a published `stele@claude-plugins-official`
  plugin. Neither exists in this repo. Needs scope before it is built.
- **Blog post corrections** — `stele-blog-post.md` in ProtonDrive has seven
  verified factual errors (wrong integrity states, wrong audit-hash claim, wrong
  type shapes). Not yet applied; awaiting choice of edit-in-place vs diff.

## Push queue

Nothing pushed yet. Branch cut from `3c22293`.
