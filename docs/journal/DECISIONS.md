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
