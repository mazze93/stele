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

---

<!-- Merged 2026-09-07, same divergence as CHECKPOINT.md. Section below is the
     2026-08-13 Muse Glimmer plan from the local branch, verbatim, H1 demoted. -->

## PLAN — Muse Glimmer local-agent evaluation & Stele integration

**Started:** 2026-08-13
**Posture:** MAX (Stele governs `secure-pride`, a MAX-posture project; this
harness itself gets the same bar)

## The request

Adopt an always-on local model for local-swarm-style agent work (currently
ad hoc `claude-local`/Ollama calls, no persistence, no audit trail). Trigger:
Meta released Muse Glimmer (30B, 4-bit quant <20GB, Apache 2.0, tuned for
long-running local agentic workflows) on 2026-08-10 — see sourcing below.

Explicit requirements from the user, not negotiable simplifications:
1. **Full provenance** — exact source, checksums, license, download record
   for whatever gets pulled.
2. **Scrutinize fine-tuned variants** — don't default to the base model
   without comparing what else exists.
3. **Versioned prompts** — the eval/production prompts live in this repo
   under version control, not typed ad hoc.
4. **Quantifiable tests** — pass/fail + measurable quality/latency metrics,
   not vibes.
5. **Hardware metrics** — RAM/CPU/thermal on the actual 24GB M5 Pro machine,
   the real constraint (`qwen3.6` at 23.9GB already ruled out as unusable
   here — see `~/Projects/secure-pride/secure-pride/docs/journal/DECISIONS.md`,
   2026-08-13 entry).
6. **`/security-review`** before considering the integration done.
7. **Strapped into Stele** specifically because `stele-core` (Hono + Prisma
   Postgres audit ledger — `POST /api/sessions`, `POST /api/sessions/:id/events`,
   hash-chained per the ADRs) is shipped and has no real traffic. Every
   Glimmer inference becomes a logged, tamper-evident session/event — this
   *is* the provenance/record-every-step requirement, implemented with
   infrastructure that already exists for exactly this purpose rather than
   a new bespoke log file.

## Sourcing (verified 2026-08-13 via WebSearch, not from training data —
model postdates knowledge cutoff)
- Meta AI Research blog, Bloomberg, NVIDIA Technical Blog, Hugging Face
  (`meta-models/Muse-Glimmer-30B`) all independently corroborate: 30B dense,
  120K+ context, distilled from proprietary "Muse Spark" flagship, Apache
  2.0, quantized to 4-bit at <20GB, targets single consumer GPU / Mac
  unified memory, tuned for tool use + long tasks + failure recovery.
- Not yet independently verified: actual quality on this machine, whether
  Ollama's registry has it or it needs a manual GGUF import from HF, whether
  fine-tuned variants exist yet (model is 3 days old at plan time).

## Files in scope
- `~/Projects/tools/stele/docs/journal/` — this journal
- `~/Projects/tools/stele/docs/adr/0004-*.md` — filed once the model/variant
  decision is actually made (research phase doesn't pre-write the ADR)
- `~/Projects/tools/stele/stele-core/` — Hono/Prisma backend, where the
  audit-logging wrapper lands
- New: an eval/ or bench/ directory for versioned prompts + test harness +
  metrics output (exact location TBD in Phase 2 — check Stele's existing
  conventions before inventing one)
- NOT in scope: the paused `secure-pride` consolidation-strategy journal —
  see its CHECKPOINT.md for the pause note

## Phases
1. **Provenance research** — model card, checksums/signing, license terms
   in full (not just "Apache 2.0" as a headline), Ollama registry
   availability vs. manual GGUF import path, and a real survey of
   fine-tuned variants (if any exist yet). Output: a provenance doc, no
   downloads yet.
2. **Decision** — base vs. a specific fine-tune, with rationale, filed as
   ADR-0004. This is the checkpoint before any multi-GB download.
3. **Pull + record** — exact command, digest, file size, timestamp,
   quantization, disk location. This is the first hard-to-reverse step
   (bandwidth + disk, though disk is not tight: 322GB free).
4. **Hardware baseline** — idle RAM/CPU on this machine, then under load
   during a representative inference, using `powermetrics`/`Activity
   Monitor`/`ollama ps` as available without requiring new sudo grants
   mid-session.
5. **Versioned eval harness** — prompt set + test cases relevant to the
   actual intended use (local-swarm candidate generation: summarization,
   classification, bulk-read tasks per the `local-swarm` skill's own
   division of labor). Quantifiable: pass/fail criteria + latency +
   token/sec, checked into the repo.
6. **Stele integration** — the audit-logging wrapper around Ollama calls,
   feeding `stele-core`'s session/event API. Minimal Hono route or thin
   client, following existing `stele-core/src` patterns.
7. **`/security-review`** on everything added in phases 3–6 before calling
   this done.
8. **Resume the paused secure-pride consolidation strategy.**

## Constraints
- 24GB unified RAM is the hard ceiling. No model/config choice that doesn't
  leave headroom for the OS and the Claude Code harness itself.
- Don't silently start the download — Phase 2's ADR is the checkpoint;
  confirm the specific pull target before running it.
- `stele-core` writes to a real Postgres-backed audit ledger — verify it's
  pointed at a dev/local database, not something shared, before generating
  test traffic against it.
