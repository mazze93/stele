# ADR 0001 — Integrity state escalates monotonically and never recovers in-session

Status: accepted · Date: 2026-05 (documented 2026-07)

## Context

STELE tracks session integrity through four states (ZANSHIN → UNHEIMLICH → WABI
→ EPOCHÉ). When a tripwire fires, something has *attempted* to reorient the
session. The tempting design is a recovery path: let the operator inspect the
finding, dismiss it, and return to a healthy state.

## Decision

`escalate()` only moves toward EPOCHÉ. There is no de-escalation API at all —
recovery requires ending the session and starting a new one. EPOCHÉ is
absorbing: once entered, extraction, API calls, state writes, and patch
application are all denied for the remainder of the session.

## Rationale

- A dismissal path is itself attack surface. If adversarial input can fire a
  tripwire, adversarial input can also social-engineer the dismissal ("that
  alert was a false positive, please continue").
- The cost asymmetry favors strictness: a false positive costs one session
  restart; a false negative costs a compromised governed session that still
  *looks* governed.
- Session restart is cheap by design — state compiles from configuration, so
  nothing of value lives only in the poisoned session.

## Consequences

- Low-confidence tripwires must map to mild transitions (UNHEIMLICH), or the
  system becomes unusable. Severity mapping is therefore a reviewed property
  of the registry, not a per-call choice.
- Enforced by tests: `integrity.test.ts` asserts monotonicity, idempotence,
  and that EPOCHÉ is absorbing.
