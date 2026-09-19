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

export type GateDecision = {
  fromIntegrity: IntegrityState
  nextIntegrity: IntegrityState
  nextFiredTobiraIds: string[]
  transitioned: boolean
}

export type EnforcementOutcome = GateDecision & { auditTrail: AuditTrail }

/**
 * Decide what a GateResult means. SYNCHRONOUS, and that is the point.
 *
 * The caller must be able to latch the new integrity state before awaiting
 * anything. Hashing the audit entries takes real time, and during that window
 * the UI still renders whatever state it last committed — so deciding and
 * recording in one `await` leaves the pre-EPOCHÉ surface live, with its
 * actions available, while the lockout is still being written. Splitting the
 * phases is what lets the latch land first.
 *
 * Returns `null` for clean input: the latching invariant means a GateResult
 * with no recommended transition must not move the state in either direction.
 */
export function decideGateResult(
  gateResult: GateResult,
  currentIntegrity: IntegrityState,
  firedTobiraIds: string[],
): GateDecision | null {
  const { scanResult, recommendedTransition } = gateResult
  if (!recommendedTransition) return null

  const nextIntegrity = escalate(currentIntegrity, recommendedTransition)
  return {
    fromIntegrity: currentIntegrity,
    nextIntegrity,
    nextFiredTobiraIds: [...new Set([...firedTobiraIds, ...scanResult.fired.map(t => t.id)])],
    transitioned: nextIntegrity !== currentIntegrity,
  }
}

/**
 * Write the evidence for a decision already made.
 *
 * Appends are sequential and individually awaited because the trail is a hash
 * chain: entry N's `integrityHash` covers entry N-1. Appending concurrently
 * produces a fork, not a chain — and a fork still has the right number of
 * entries, so counting them is not a check.
 *
 * Takes the trail as an argument and returns the new one rather than touching
 * shared state, so the caller can serialize writes against the latest trail
 * instead of a snapshot captured before the await.
 */
export async function recordGateResult(
  gateResult: GateResult,
  decision: GateDecision,
  auditTrail: AuditTrail,
): Promise<AuditTrail> {
  let trail = auditTrail

  for (const tobira of gateResult.scanResult.fired) {
    trail = await appendEntry(trail, 'tobira-fired', {
      tobiraId: tobira.id,
      tobiraCode: tobira.auditCode,
      secretsDetected: gateResult.scanResult.secretsDetected,   // boolean only — ADR-0003
    })
  }

  if (decision.transitioned) {
    trail = await appendEntry(
      trail,
      decision.nextIntegrity === 'EPOCHÉ' ? 'epoche-entered' : 'utsuroi-transition',
      { fromState: decision.fromIntegrity, toState: decision.nextIntegrity },
    )
    trail = { ...trail, currentState: decision.nextIntegrity }
  }

  return trail
}

/**
 * Decide and record in one call. Convenience for tests and any caller that is
 * not rendering a UI; a UI caller should use the two phases directly so the
 * latch lands before the first await.
 */
export async function applyGateResult(
  gateResult: GateResult,
  currentIntegrity: IntegrityState,
  firedTobiraIds: string[],
  auditTrail: AuditTrail,
): Promise<EnforcementOutcome | null> {
  const decision = decideGateResult(gateResult, currentIntegrity, firedTobiraIds)
  if (!decision) return null
  return { ...decision, auditTrail: await recordGateResult(gateResult, decision, auditTrail) }
}
