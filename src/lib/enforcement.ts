// === ENFORCEMENT BOUNDARY — PLAN phase 5 ===
//
// A fired TOBIRA is not proof that anything happened. `scanPasteInput()`
// returning a Tobira and `gate()` returning blocked=true are both claims about
// a function's return value; neither shows that the integrity state actually
// escalated or that the audit chain recorded it. That evidence has to come
// from the layer that does the escalating.
//
// This logic previously lived inside `App.handleGateResult`, where it could
// only be exercised by rendering the app. It is extracted verbatim so the
// enforcement boundary can be asserted directly. App.tsx is now a thin
// adapter over this function and holds no enforcement logic of its own.
//
// Two invariants carried over from the original, both load-bearing:
//   - LATCHING: clean input returns null and never de-escalates. escalate()
//     is monotonic (ADR-0001); nothing here may work around that.
//   - SNAPSHOT: every write below uses `nextIntegrity`, never a re-read of
//     component state, so a concurrent render cannot split the transition
//     from the audit entry that records it.

import { escalate } from './integrity'
import { appendEntry } from './audit'
import type { IntegrityState } from './integrity'
import type { AuditTrail } from './audit'
import type { GateResult } from './security'

export type EnforcementOutcome = {
  nextIntegrity: IntegrityState
  nextFiredTobiraIds: string[]
  auditTrail: AuditTrail
  transitioned: boolean
}

/**
 * Apply a GateResult to integrity state and the audit chain.
 *
 * Returns `null` for clean input — no transition, no audit entries, nothing
 * written. That is the latching invariant: a GateResult with no recommended
 * transition must not be able to move the state at all, in either direction.
 *
 * Audit entries are appended in sequence and awaited individually, because
 * the chain is a hash chain: entry N's `integrityHash` covers entry N-1's.
 * Appending concurrently would produce a fork, not a chain.
 */
export async function applyGateResult(
  gateResult: GateResult,
  currentIntegrity: IntegrityState,
  firedTobiraIds: string[],
  auditTrail: AuditTrail,
): Promise<EnforcementOutcome | null> {
  const { scanResult, recommendedTransition } = gateResult
  if (!recommendedTransition) return null

  const nextIntegrity = escalate(currentIntegrity, recommendedTransition)
  const nextFiredTobiraIds = [...new Set([...firedTobiraIds, ...scanResult.fired.map(t => t.id)])]

  let trail = auditTrail
  for (const tobira of scanResult.fired) {
    trail = await appendEntry(trail, 'tobira-fired', {
      tobiraId: tobira.id,
      tobiraCode: tobira.auditCode,
      secretsDetected: scanResult.secretsDetected,   // boolean only — ADR-0003
    })
  }

  const transitioned = nextIntegrity !== currentIntegrity
  if (transitioned) {
    trail = await appendEntry(
      trail,
      nextIntegrity === 'EPOCHÉ' ? 'epoche-entered' : 'utsuroi-transition',
      { fromState: currentIntegrity, toState: nextIntegrity },
    )
    trail = { ...trail, currentState: nextIntegrity }
  }

  return { nextIntegrity, nextFiredTobiraIds, auditTrail: trail, transitioned }
}
