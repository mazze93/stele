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

## 2026-08-04 · Work happens on a branch, not detached HEAD

**Why:** the worktree opened at detached `3c22293`. Commits on a detached HEAD
are unreachable after the next checkout — precisely the loss mode this skill
exists to prevent.

**Reverse:** the branch is disposable; `git branch -D` it and re-cut from `main`.
