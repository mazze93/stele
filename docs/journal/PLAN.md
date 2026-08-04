# PLAN — CLAUDE.md reconciliation · review triage · stele-core perimeter · eval harness

**Session opened:** 2026-08-04
**Worktree:** `~/Projects/tools/worktrees/stele/major-newt/stele` (branch created from detached HEAD at `3c22293`)
**Posture:** GUARDIAN

## The request, restated

Four threads, in the order the user gave them:

1. **Apply the CLAUDE.md edits** agreed earlier — items 1, 3–6, 8–9 of the drift
   audit: Hono-not-Express, the missing UI/Tailwind stack, single-test command,
   CI description, `docs/superpowers/`, and rewriting the two OPEN QUESTIONS to
   match what the code actually does. Items 2 (version drift) and 7
   (`wrangler.toml` vs `site/README.md`) were explicitly *not* included — they
   need a human decision about which side is correct.
2. **Critically evaluate `~/Public/Vaults/Research/Stele Repository Review.md`
   and begin acting on it.** Evaluate first — the review is a GitHub-source read
   and parts of it are stale. Act on what survives.
3. **Fix the stele-core PR #11 security perimeter.** PR #11 (merged) added
   `stele-core/` with no authentication on `/api/*`. Add bearer-token middleware
   and bind the listener to loopback.
4. **Add a formal eval harness to stele**, and consider (a) routing Anthropic
   calls through `tools/adaptive-response` rather than browser-direct, and
   (b) emitting a `claude-code-hint` plugin marker from a CLI entrypoint.

## Files and repos in scope

| Path | Phase | Change |
|---|---|---|
| `CLAUDE.md` | 1 | Reconcile 7 drift items |
| `docs/journal/*` | 0 | This scaffold |
| `stele-core/src/server.ts` | 2 | Bearer-token middleware on `/api/*` |
| `stele-core/index.ts` | 2 | Bind `127.0.0.1` |
| `stele-core/.env.example`, `stele-core/README.md` | 2 | Document `API_SECRET` |
| `stele-core/src/schemas.ts`, `stele-core/src/routes/sessions.ts` | 3 | Server-side hash recomputation (proposed) |
| `.claude/settings.local.json`, `.gitignore` | 3 | Untrack committed operator permissions (proposed) |
| `src/lib/extractor.ts` | 3 | Strict JSON parse (proposed) |
| `src/App.tsx` | 3 | Serialize audit writes, honest counter (proposed) |
| `evals/` (new) | 4 | Adversarial eval harness (not yet designed) |

Out of scope unless asked: `src/lib/version.ts` / `package.json` version
reconciliation, `wrangler.toml` deploy-shape question, the blog-post
corrections in ProtonDrive, the `.pxd` banner.

## Phases

- [x] **Phase 0** — scaffold + assumption check (this file)
- [ ] **Phase 1** — CLAUDE.md reconciliation (authorized)
- [ ] **Phase 2** — stele-core `/api/*` auth perimeter + loopback bind
- [ ] **Phase 3** — review triage: the findings that survived evaluation
- [ ] **Phase 4** — eval harness design + first adversarial corpus
- [ ] **Phase 5** — adaptive-response routing decision; CLI plugin-hint decision

## Known constraints

- **No `node_modules` in this worktree and no `pnpm` on PATH.** Tests cannot be
  run here until deps are installed. The review itself flags install-time
  supply-chain risk, so installing is a decision, not a reflex — deferred to the
  user (see CHECKPOINT).
- `integrity.ts` must keep zero imports from project code (strict DAG).
- `secretsDetected` stays boolean; never log what was found.
- Lexicon terms are load-bearing in any string reaching compiled output.
