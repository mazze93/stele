# Group 2 Wiring + Repo Security — Design Spec
**Date:** 2026-05-06  
**Project:** STELE / directive-remixer  
**Integrity group:** 2 (audit wiring) + repo hardening  
**Tesserae resolved:** T-001, T-003, T-007, T-008  
**Tesserae opened:** none

---

## Scope

Wire `escalate()`, `appendEntry()`, and `session-start` into App.tsx. Fix `gate()` return type (T-007). Surface the audit trail to the operator via header count and UtsuroiPanel log. Show fired TOBIRA diagnostic on EPOCHÉ lockout screen (T-008). Harden the git repository with branch protection, dependabot, CI, and a PR template.

---

## 1. State Co-Initialization

`DirectiveState` and `AuditTrail` must share the same `sessionId`. Two separate `useState` calls with independent initialisers would generate two different IDs.

**Fix:** `buildSession()` helper (private to App.tsx) constructs both atomically:

```ts
function buildSession() {
  const state = buildDefaultState()
  return { state, audit: createAuditTrail(state.sessionId) }
}
```

App state:

```ts
const [session]                   = useState(buildSession)   // lazy, one-time seed
const [state, setState]           = useState(session.state)
const [auditTrail, setAuditTrail] = useState(session.audit)
```

`session` is never updated — it exists only to seed the two reactive values from a shared initialisation call.

---

## 2. App.tsx Wiring

### `handleGateResult(gateResult: GateResult)`

Central wiring function. Defined in App.tsx; passed to `LeftRail` as `onGateResult?` so Group 4 (InheritPanel) can call it without further prop-threading.

```
if recommendedTransition is null → return early (clean input, no state mutation)
nextIntegrity = escalate(currentIntegrity, recommendedTransition)
nextFiredIds  = union(state.firedTobiraIds, scanResult.fired.map(t => t.id))
hash          = integrityHash(nextIntegrity, state.sessionId, 0)
setState(...)       — new integrityState + firedTobiraIds
setAuditTrail(...) — append tobira-fired per TOBIRA, then utsuroi-transition or
                     epoche-entered if state changed; update currentState
```

`setState` and `setAuditTrail` are separate synchronous calls — no side effects inside setState callbacks.

**Snapshot invariant:** All audit entry metadata (`fromState`, `toState`, integrity color) must be derived from `nextIntegrity` — the local variable computed before any setter is called. Never read `state.integrityState` after computing `nextIntegrity`; React 18 batches updates and the closure value is stale at `setAuditTrail` call time.

**Latching invariant:** Clean input after a TOBIRA fires does NOT de-escalate state. Only `handleReset()` clears the session. This is intentional — see integrity.ts comment "Always escalates — never de-escalates within a session."

### `session-start` on mount

`useEffect` with empty deps, guarded by `useRef(false)` against React StrictMode double-fire. `ref.current = true` is set as the **first line** of the effect body — before any state call — so that if `appendEntry` is ever made async, the guard still fires before any await boundary.

### `handleReset()`

Creates fresh `buildDefaultState()` + `createAuditTrail(newState.sessionId)`. Both setters called. Old trail is destroyed — the EPOCHÉ screen shows the diagnostic before reset occurs.

### `onGateResult` prop threading

`LeftRail` receives `onGateResult?: (r: GateResult) => void`. Not used by any existing LeftRail child yet; present so Group 4 (InheritPanel) can consume it without further App.tsx changes.

---

## 3. `gate()` Type Fix (T-007)

`GateResult.recommendedTransition` changes from `IntegrityState` to `StateTransition | null`.

`null` = clean input, no transition needed. Callers guard on null before calling `escalate()`.

### Severity loop

```ts
const ORDER_INDEX: Record<string, number> = Object.fromEntries(
  (['ZANSHIN','UNHEIMLICH','WABI','EPOCHÉ'] as const).map((s, i) => [s, i])
)

let recommendedTransition: StateTransition | null = null

for (const tobira of scanResult.fired) {
  findings.push(`[${tobira.auditCode}] ${tobira.message}`)   // always first

  const incoming = ORDER_INDEX[tobira.transition]
  if (incoming === undefined) {
    findings.push('[SYS_ANOMALY] Unrecognized integrity transition — failing closed.')
    return { blocked: true, scanResult, recommendedTransition: 'EPOCHÉ', findings, charCount }
  }

  const current = recommendedTransition ? ORDER_INDEX[recommendedTransition] : -1
  if (incoming > current) recommendedTransition = tobira.transition
}
```

**Invariants:**
- `findings.push` runs before any guard check — the audit trail is never blank on a lockout
- Unknown transition strings → immediate EPOCHÉ (fail-closed, not fail-open)
- `ORDER_INDEX` is module-scope: O(1) lookups, no in-loop `indexOf`
- `StateTransition ⊂ IntegrityState` — all valid transition values are present in `ORDER_INDEX`

---

## 4. Telemetry Surface

### Header

Pass `auditCount={auditTrail.entries.length}` as a primitive — not the `auditTrail` object. Header re-renders only when count changes, not on every `appendEntry()` call.

Display: `[ 残  ZANSHIN  ·  3 TOBIRA  ·  12 ◈ ]`

`◈` shown only when `auditCount > 0`.

### UtsuroiPanel — `UTSUROI TRAIL` section

New section below TOBIRA registry. Prop: `auditTrail: AuditTrail`.

Display array memoized:
```ts
const displayTrail = useMemo(() =>
  [...auditTrail.entries].slice(-30).reverse(),
[auditTrail.entries])
```

Hash column CSS: `max-width: 8ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-variant-numeric: tabular-nums`

- `session-start` entries: dim styling — structural, not threat signals
- `tobira-fired`, `utsuroi-transition`, `epoche-entered`: highlighted in integrity state color

### EPOCHÉ lockout screen (T-008)

Fired TOBIRA lookup with graceful fallback:
```ts
const firedTobira = state.firedTobiraIds.map(id =>
  TOBIRA_REGISTRY.find(t => t.id === id)
  ?? { auditCode: 'UNKNOWN', message: 'Unregistered integrity exception.' }
)
```

Display: each entry as `[KAPU-001] Explicit governance override detected in input.`

Security: `message` fields are static compile-time strings from `TOBIRA_REGISTRY` — never the matched payload. React renders as text nodes. No XSS path.

Footer: `session: {id} · {n} TOBIRA fired · {m} audit entries` — `m` visible before reset so operator knows how much trail existed.

---

## 5. Repo Security

### `.github/workflows/typecheck.yml`

```yaml
name: typecheck
on: [push, pull_request]
jobs:
  tsc:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit
```

### `.github/dependabot.yml`

Weekly npm updates, max 5 open PRs, `dependencies` label.

### `.github/pull_request_template.md`

```markdown
## What
<!-- one sentence -->

## Integrity
- Group: 1 / 2 / 3 / 4 / 5
- Tesserae resolved: T-xxx / none
- Tesserae opened: T-xxx / none

## Test
- [ ] `npx tsc --noEmit` passes
- [ ] Dev server starts clean
```

### `SECURITY.md`

One-page policy: adversarial paste surface; report privately via mazze.leczzare@protonmail.com; no CVE process; direct contact preferred.

### Branch protection (`gh api`)

```
required_pull_request_reviews: { required_approving_review_count: 0, dismiss_stale_reviews: true }
required_status_checks: { strict: false, contexts: ['tsc'] }
allow_force_pushes: false
allow_deletions: false
enforce_admins: true
```

`required_approving_review_count: 0` — PRs required, no approval gating (solo maintainer). Bump to 1 when collaborators join.

`strict: false` — explicit accepted tradeoff. The `tsc` check runs against the PR branch without requiring it to be up-to-date with `main`. A type regression introduced in `main` after the PR branch was cut won't be caught until after merge. Acceptable for a solo maintainer; revisit when collaborators join or when merge queues are enabled.

---

## 6. Tessera Cleanup

Remove from `directive-remixer` tesserae in `projects.ts`:
- **T-001** — `escalate()` now wired via `handleGateResult`
- **T-003** — `appendEntry()` now wired at all state transitions
- **T-007** — `gate()` return type corrected
- **T-008** — EPOCHÉ screen now shows fired TOBIRA diagnostic

Remaining open: T-002, T-004, T-005, T-006, T-009, T-010.

---

## Files Changed

| file | change |
|------|--------|
| `src/lib/security.ts` | `GateResult.recommendedTransition: StateTransition \| null`; `ORDER_INDEX`; fail-closed guard; findings-first loop |
| `src/App.tsx` | `buildSession()`; `auditTrail` state; `handleGateResult()`; `session-start` effect; `handleReset()`; `auditCount` prop; `onGateResult` on LeftRail; EPOCHÉ TOBIRA detail |
| `src/components/LeftRail.tsx` | `onGateResult?: (r: GateResult) => void` added to Props |
| `src/components/panels/UtsuroiPanel.tsx` | `auditTrail: AuditTrail` prop; `UTSUROI TRAIL` section; memoized display array; hash column CSS constraints |
| `src/data/projects.ts` | Remove T-001, T-003, T-007, T-008 from tesserae |
| `.github/workflows/typecheck.yml` | new |
| `.github/dependabot.yml` | new |
| `.github/pull_request_template.md` | new |
| `SECURITY.md` | new |
