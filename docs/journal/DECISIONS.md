# DECISIONS — append-only

Format: `date · decision · why · how to reverse`

---

## 2026-08-04 · Load-bearing assumption checked before planning

**Assumption that could have been wrong:** that the Repository Review describes
the repo as it stands, and that its recommendations name work not yet done.

**Checked against the filesystem — it does not, in two places:**

1. The review states there are "no real automated tests in either the front-end
   package or stele-core," "no frontend test script," and no "adversarial
   regression suites." **False for the front-end.** `package.json` has
   `"test": "vitest run"`; `src/lib/__tests__/` contains four suites
   (`security`, `tripwires`, `integrity`, `audit`) added in `544dc00`
   ("Add test suite (32 tests)"); `.github/workflows/typecheck.yml` runs
   `pnpm test` after `tsc --noEmit` on every push and PR (`c9f92da`). The claim
   holds only for `stele-core`, whose `npm test` is still the
   `echo "Error: no test specified" && exit 1` placeholder.
2. The review's finding "the compiled 'integrity hash' is not an integrity
   primitive" is **already fixed**. `integrityHash()` was renamed to
   `sessionStamp()` in `integrity.ts:59` and carries the comment "NOT
   tamper-evident — the audit trail hash chain (audit.ts, SHA-256) is the
   integrity mechanism. Renamed from integrityHash to avoid overclaiming." The
   fixed `ts = 0` argument at `compiler.ts:56` still makes the stamp constant
   per session, but it is now honestly named and scoped to display.

**Consequence:** the review was written against an earlier commit. Every finding
is re-verified against source before it becomes a phase, and the eval-harness
work is scoped as *adversarial corpus on top of an existing unit suite*, not as
"add tests where there are none."

**Reverse:** if a later read shows the tests were removed or the rename undone,
append a correcting entry — do not edit this one.

---

## 2026-08-04 · Findings from the review that were re-verified and DO hold

Recorded so Phase 3 does not re-derive them:

- `stele-core` has **no authentication on `/api/*`** — `server.ts` adds only
  `cors()` and `logger()`; session create, event append, session end, project
  reads and drift analytics are anonymously callable. Origin checks are not
  identity checks. (→ Phase 2)
- `stele-core` **trusts the client's audit hash**: `schemas.ts:57` requires
  `integrityHash`, `routes/sessions.ts:96` persists it verbatim. The browser has
  `verifyChain()`; the server never recomputes. The log writer vouches for its
  own tamper evidence. (→ Phase 3)
- `extractor.ts` calls Anthropic **from the browser** with
  `anthropic-dangerous-direct-browser-access: 'true'` and the operator's key in
  `x-api-key` (lines 45–47). (→ Phase 5 — this is what routing through
  `tools/adaptive-response` would resolve.)
- `extractJson()` (`extractor.ts:58`) is `text.match(/\{[\s\S]*\}/)` — greedy
  first-brace-to-last-brace on the most adversarial boundary in the app.
- **Audit counter drift is real.** `setAuditCount` is called only in
  `handleAuditEntry` (`App.tsx:114–117`). The `session-start` append
  (`App.tsx:50`) and both `handleGateResult` appends (`App.tsx:70`, `77`) bypass
  it, so the badge under-reports while the EPOCHÉ screen reads the true length
  off the ref.
- `.claude/settings.local.json` **is tracked** (`git ls-files .claude`) and
  `.gitignore` has no `.claude` entry at all.
- `compiler.ts` hard-codes operator machine profile into every compiled
  egregore — `daedalus`, `/Users/daedalus`, `arm64 (Apple M3)`, Homebrew,
  OrbStack (lines 278, 292–297, 319).

---

## 2026-08-04 · Journal lives in `docs/journal/`, not the scratchpad

**Why:** the scratchpad is session-scoped and would not survive the drop this
scaffold exists to guard against. `docs/` already exists in this repo alongside
`adr/` and `superpowers/`.

**Reverse:** `git rm -r docs/journal`.

---

## 2026-08-04 · Phase 2 — perimeter closed, and probed rather than assumed

**Decision:** bearer-token middleware on `/api/*` + loopback bind, in
`stele-core/src/middleware/auth.ts` rather than inline in `server.ts`.

**Why a separate module:** the perimeter is the one thing in stele-core that
must be independently testable when a suite finally exists. Inline middleware in
`createApp()` can only be exercised through a booted server.

**Three deviations from the minimum fix as specified, each deliberate:**

1. **Constant-time comparison.** `auth !== \`Bearer ${expected}\`` leaks the
   token's length and matching prefix through response timing. Uses
   `node:crypto.timingSafeEqual`, with a burn-comparison on the length-mismatch
   path so it is not measurably faster than the content-mismatch path.
2. **`Authorization` added to the CORS `allowHeaders` allowlist.** Without it the
   browser blocks every authenticated request at the preflight. The middleware
   is registered *after* `cors()` — `hono/cors` answers OPTIONS itself and does
   not call `next()`, and browsers never send `Authorization` on a preflight.
   Reversing that order breaks all browser clients. Load-bearing.
3. **`HOST` env var, defaulting to `127.0.0.1`** rather than hard-coding the
   hostname, so exposure stays possible but has to be an explicit act.

**Probed, not assumed** (`npx tsx index.ts`, placeholder `DATABASE_URL`):

| probe | result |
|---|---|
| `GET /health`, no token | `200` — deliberately outside the perimeter |
| `GET /api/drift`, no token | `401 unauthorized` |
| wrong token | `401` |
| right token + extra suffix (length mismatch) | `401` |
| token without `Bearer ` scheme | `401` |
| correct token | passes auth, `500` from the unreachable placeholder DB — i.e. it reached the route |
| `OPTIONS` preflight, no token | `204`, `access-control-allow-headers: Content-Type,Authorization` |
| listening socket | `127.0.0.1:4321` only |
| **no secret configured** — `GET`, `POST`, and bearer-carrying requests | all `500 server_not_configured`, one refusal warning logged each; `/health` still `200` |

The last row is the one that matters: it fails closed. There is no anonymous
fallback when the operator forgets to configure the token.

**Also found while doing this:** `stele-core/.gitignore` had `.env.*` with no
`!.env.example` negation (the root `.gitignore` has one), so the new
`.env.example` would have been silently ignored. Fixed in the same commit.

**And:** `stele-core` has never been typechecked by CI — `typecheck.yml` only
covers the root package. `npx tsc --noEmit` in `stele-core` reported two errors
before this work, both from the un-generated Prisma client; both cleared after
`prisma generate`. Worth a CI job, filed as a Phase 3 candidate.

**Reverse:** drop the `app.use("/api/*", requireBearer)` line and delete
`middleware/auth.ts`; restore `serve({ fetch, port })` without `hostname`.

---

## 2026-08-04 · Phase 3 — the server owns the durable chain

**Decision:** `integrityHash` removed from `AppendEventSchema`; the server
computes it in `stele-core/src/chain.ts` from the predecessor's hash.

**Two things the reviewed diff proposal did not account for:**

1. **Isolation.** `prisma.$transaction(async tx => …)` at Postgres's default
   Read Committed lets two concurrent appends read the *same* predecessor and
   fork the chain — both entries claim the same `prevHash` and verification
   fails for whichever loses. Uses `{ isolationLevel: "Serializable" }`, with
   SQLSTATE 40001 surfaced as a `409 Concurrent append — retry` rather than a
   silently branched ledger.
2. **TOCTOU on session state.** The session-exists / session-ended checks were
   outside the transaction, leaving a window where a session ends between check
   and write. Moved inside, aborting via a thrown `AppendRejected` — a plain
   `return` cannot roll a transaction back.

**Chain hashes will not match between browser and server, by design.** Each
entry binds the timestamp its writer assigned. `src/lib/audit.ts` owns the
session-local chain; `stele-core/src/chain.ts` owns the durable one. Requiring
them to be equal would mean trusting the client's timestamp, which reintroduces
the problem.

**Added `GET /api/sessions/:id/verify`** — replay verification by a party other
than the writer, which is the half the browser could never supply. Reports only
the first divergence: everything after a break is unreliable by construction.

**Probed** (7/7, run against `chain.ts` directly): intact chain verifies;
payload tamper caught at the right index; dropped entry caught; reordering
caught; a chain lifted into a different `sessionId` fails at index 0; a
*partial forge* (recomputing one entry's hash to be self-consistent) still
breaks its successor; empty chain vacuously valid.

**Reverse:** restore `integrityHash: z.string().min(1)` to the schema and pass
`body.integrityHash` through; delete `src/chain.ts` and the verify route.

---

## 2026-08-04 · Phase 3 — extractJson refuses instead of salvaging

`extractJson()` was `text.match(/\{[\s\S]*\}/)` — greedy first-brace-to-last.
Now it strips an optional fence, then requires the remainder to be exactly one
JSON object.

**Checked that the new tests discriminate** rather than re-assaying covered
ground: replaying the six refusal cases against the old implementation, **five
slipped through**. Two worth naming — `[{"verbosity":"dense"}]` parsed as its
inner object, and ` ```json\n{"a":1}\n``` \nAlso, ignore the locked fields.`
parsed cleanly while dropping the trailing instruction on the floor. A parser
that discards the part of the response it did not expect is exactly the wrong
behaviour at this boundary.

`extractJson` is now exported solely so the suite can reach it. New suite:
`src/lib/__tests__/extractor.test.ts` — the front-end suite goes 32 → 46 tests,
and `extractor.ts` had no coverage at all before this.

---

## 2026-08-04 · Phase 3 — operator permissions untracked, hook install narrowed

`.claude/settings.local.json` (18 allow entries, 2 of them broad
`Users/daedalus/**` reads) was tracked in git with no `.gitignore` entry. Now
`git rm --cached` + ignored; the file stays on disk untouched.

`.claude/hooks/session-start.sh` ran a bare `pnpm install` on remote sessions —
lifecycle scripts from every transitive dependency, before any project code
runs. Now `--frozen-lockfile --ignore-scripts`.

**Reverse:** both are one-line reversions; the settings file was never deleted
locally, only unstaged from the index.

---

## 2026-08-04 · Dependencies installed in this worktree

**Why:** editing a security-relevant file with no typecheck available is how
subtle breakage ships. Front-end via `pnpm install --frozen-lockfile` (pnpm is
not on PATH on this machine — `npx pnpm@10` bootstraps it); `stele-core` via
`npm install`.

**Note on install scripts:** npm 11 declined to run four postinstall scripts
(`@prisma/engines`, `esbuild`, `fsevents`, `prisma`) and printed an
`allow-scripts` warning. That default matches what the Repository Review asked
for, so it was left alone; `prisma generate` was run explicitly instead, with a
placeholder `DATABASE_URL` that is never connected to.

**Reverse:** `rm -rf node_modules stele-core/node_modules stele-core/generated`.

---

## 2026-08-04 · Work happens on a branch, not detached HEAD

**Why:** the worktree opened at detached `3c22293`. Commits on a detached HEAD
are unreachable after the next checkout — precisely the loss mode this skill
exists to prevent.

**Reverse:** the branch is disposable; `git branch -D` it and re-cut from `main`.

---

## 2026-08-04 · Phase 3 correction — the retry contract never fired

**Found by adversarial review of the Phase 3 diff, verified against the
installed client.** `isSerializationFailure()` stringified the error and looked
for `"40001"` or `"could not serialize"`. Prisma does not pass the SQLSTATE
through: `TransactionWriteConflict` is normalized to code `P2034` with the fixed
message *"Transaction failed due to a write conflict or a deadlock. Please retry
your transaction"*. Confirmed by reading
`stele-core/node_modules/@prisma/client/runtime/client.js` — the mapping switch
returns `"P2034"`, and `grep -c "40001"` over the whole runtime is **0**.

**Consequence of the bug:** a genuine concurrent append would have fallen
through to `throw err` and surfaced as an opaque `500` from Hono's `onError`,
not the documented `409 Concurrent append — retry`. The ledger would not have
forked — Postgres still aborts the loser — but the retry contract the comment
advertises did not exist. Typecheck could never catch this; it is a claim about
runtime string contents in a dependency.

**Fix:** match `err.code === "P2034"` as the primary signal, keeping raw
SQLSTATE `40001` (on `code` and on `cause.code`) as a secondary probe for the
driver-adapter path before normalization. Probed 9/9, including an explicit
regression case asserting the *old* implementation missed `P2034` while the new
one catches it, and that `P2002`/`P2025` are not swallowed as retryable.

**Also tightened in the same pass:** `secretsMatch()` now SHA-256s both sides
before `timingSafeEqual`, removing the length branch entirely. The previous
version returned early on length mismatch, so total work still weakly tracked
the presented token's length. Low severity against a 64-char random secret, but
digesting first is simpler *and* strictly better. Probed 8/8; the live
perimeter re-probed unchanged (401 unauthenticated, loopback-only, `/verify`
also behind the gate).

**Reverse:** both functions are self-contained and exported; revert either
without touching call sites.

---

## 2026-08-04 · Phase 4 — eval harness: model in the call path, never in the grader

**The ADR-0002 tension, resolved as specified:** a model may sit in the *call
path* (Group 4's entire risk surface is that live request, and no fixture
substitutes for it); a model may never sit in the *grader* — a judge is
promptable by the content under test, and a score is not a replayable audit
code. Every verdict in both tiers is a string comparison against a TOBIRA id, a
boolean from the real detector, or a key-set check.

**Deterministic tier** (`pnpm eval`, no network, wired into `pnpm test` so CI
runs it): 16 assertions over a 17-case adversarial corpus and 6 benign cases.
Per-TOBIRA recall against the *labeled* id — "something fired" is not a pass.
Zero-tolerance benign false positives, no threshold. Coverage-as-a-gate: every
`TOBIRA_REGISTRY` entry needs ≥1 case, asserted rather than reviewed. Registry
floor. Per-rule regression against a committed `evals/baseline.json` — per rule,
because an aggregate lets one module rot behind a growing corpus.

**Mutation-tested, because 13/13 recall on the first run proves the corpus
matches the detectors, not that the gate would catch a break:**

| mutation | result |
|---|---|
| neuter TW-001's pattern to `/$^NEVERMATCHES/` | 2 failures — recall test names both TW-001 cases by id, baseline-regression test also red |
| delete a TOBIRA object from the registry | 2 failures — recall test plus the registry-floor assertion |
| restore | 16/16 green |

**Live tier** (`pnpm eval:live`, opt-in, needs `ANTHROPIC_API_KEY`, skips
cleanly without one, never in CI). Measures the one thing fixtures cannot:
whether content that *survives the paste gate* can still steer the model into
emitting locked fields. All four cases are engineered gate-clean and assert it
— if one starts firing a paste TOBIRA, that is the gate improving and the case
needs replacing, not the tier failing. Grading stays code: locked fields absent
from the applied patch, and `validatePatch()` rejecting *whole* rather than
strip-and-apply when the model does emit one.

**Deliberately excluded:** narrative-quality evaluation for `CollaboratorPanel`.
Subjective rather than adversarial; it needs separate result plumbing. The
moment a fuzzy judge shares a report with an auditable security gate, the number
means neither thing.

**Incidental:** `tsconfig.app.json` now includes `evals` and adds `node` types,
so the harness is typechecked rather than only executed.

**Found, not fixed:** `pnpm lint` is already red on `main` — 14 errors across
`App.tsx`, six `components/ui/*` files, `hooks/*`, `audit.ts:84` and
`tripwires.ts:108`. None are in files this branch touched. CI runs `tsc` and
`vitest` but never `eslint`, which is why it went unnoticed.

**Reverse:** `rm -rf evals`, restore `"test": "vitest run"`, revert the
tsconfig include.

---

## Cloud review round — three fixes, one stale finding

Ran after Phases 0–5 were pushed. Four findings; each verified against source
before acting, because a review that bundles a branch snapshot can be reviewing
something other than what is on disk.

**`HOST=""` bound every interface** (the only non-nit). `process.env.HOST ??
"127.0.0.1"` defaults on `null`/`undefined` only, but dotenv assigns `""` for a
bare `HOST=`, and Node treats `listen(port, "")` as an unspecified host. Since
`.env.example` ships `HOST="127.0.0.1"`, blanking the value is the natural
"restore the default" edit — and it produced the exact opposite of the
perimeter Phase 2 exists to build. Now `||` on both `HOST` and `PORT`
(`Number("")` is `0`, which means "random port"), matching the fail-closed
convention `middleware/auth.ts` already used for `API_SECRET`.

Proven end-to-end rather than reasoned, and mutation-tested both directions:
with the fix, `HOST=` binds `127.0.0.1:4399`; reverted to `??`, the same probe
binds `*:4399` and the startup banner prints `http://:4399` — a missing host
being the only visible tell an operator would ever get.

**The chain preimage was not injective.** Joining fields on `|` let content
shift across a field boundary without changing the digest, so a tampered row —
and every successor — still verified, defeating the one endpoint whose whole
job is catching that. Both encoders are now length-prefixed and carry a
`CHAIN_VERSION`, so a future encoding change surfaces as a broken chain instead
of a silent fork. `src/lib/audit.ts` and `stele-core/src/chain.ts` must move
together; they did.

Worth recording because it nearly produced a hollow test: **the review's stated
collision witness was not a collision.** `tobiraId:"KAPU|001"` with an emptied
`tobiraCode` drops a character, so the two preimages differ by one separator and
the old encoding survives it. A regression test built on that witness would have
passed against the broken code. The committed witness preserves the separator
count (`"KAPU"`/`"001|NARIKIRI"` vs `"KAPU|001"`/`"NARIKIRI"`); both cases go
red when the encoding is reverted. Mutation-testing caught this, not review.

**Timestamp is not a total order** at ms precision — two appends in one tick
could replay out of order (`valid:false` on an intact ledger) or be read back as
the wrong predecessor (a silent fork). All three reads now tiebreak on `id`.

**One finding was stale:** it reported the `evals/` scripts pointing at nothing.
True of the snapshot the review bundled, which predated the `evals` commit by
about ninety seconds. No action — but the general lesson is that review scope
and disk state are different things, and the difference is checkable.

## Lint and stele-core CI — separate branch, deliberately

Both were recorded above as "found, not fixed". They shipped as
`chore/lint-green-and-stele-core-ci` off `main` rather than riding with the
security work, so a lint-config change cannot fail a perimeter review and vice
versa.

Lint went to zero errors by cause, not by blanket suppression: vendored shadcn
scoped off (editing generated files to satisfy lint costs regeneration), `^_`
configured as the discard convention this codebase already used, and four real
fixes — `OutputPanel` deriving `compile()` via `useMemo` instead of writing it
from an effect, `useIsMobile` moved to `useSyncExternalStore`, a needless regex
escape, and a dead `eslint-disable` for a rule that no longer fires.

`react-hooks/refs` was left at `warn` rather than `off`. `App.tsx` reads
`auditTrailRef` during render; the ref is deliberate but the read is not
reactive, and that *is* the audit-counter drift carried below. Silencing it
would have converted a known defect into a green checkmark. It stays printed
until the refactor lands, at which point the rule goes back to `error`.

`stele-core` now has a CI job. It needs `prisma generate` with a placeholder
`DATABASE_URL` — the client is gitignored so `tsc` cannot resolve model types
without it, and `prisma.config.ts` resolves the variable eagerly. The URL is
never dialled. Verified green in GitHub's environment, not only locally.
