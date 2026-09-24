// === AUDIT WRITE SERIALIZATION ===
//
// The audit trail is a hash chain, and every writer follows the same shape:
// read the current trail, await an append, write the result back. That shape
// is a lost-update race the moment two writers overlap.
//
//   A reads trail(3 entries) ─ await ─────────────→ writes trail(4)
//   B reads trail(3 entries) ─── await ──→ writes trail(4')
//
// B's write lands last and A's entry is gone. The surviving chain still
// VERIFIES — it is internally consistent, just shorter — so `verifyChain()`
// cannot detect this and neither can an entry count. The evidence for a fired
// TOBIRA or an integrity transition disappears silently, which is the one
// failure mode an audit trail may not have.
//
// The fix is not a lock but an ordering: every write is queued behind the
// previous one and reads the trail INSIDE its turn, after the prior write has
// landed, rather than from a snapshot taken before it.

import type { AuditTrail } from './audit'

export type AuditWriter = (trail: AuditTrail) => Promise<AuditTrail>

export type AuditQueue = {
  /** Queue a write. Resolves with the trail as of the end of this write. */
  enqueue: (write: AuditWriter) => Promise<AuditTrail>
  /** The trail as of the last completed write. */
  current: () => AuditTrail
  /** Resolves when every queued write has settled. */
  drain: () => Promise<void>
}

export function createAuditQueue(initial: AuditTrail): AuditQueue {
  let trail = initial
  // The tail of the chain. Never rejects — a failed write must not wedge the
  // queue and strand every entry behind it.
  let tail: Promise<unknown> = Promise.resolve()

  function enqueue(write: AuditWriter): Promise<AuditTrail> {
    const result = tail.then(async () => {
      // Read inside the turn, not at call time. This is the whole mechanism.
      trail = await write(trail)
      return trail
    })
    tail = result.catch(() => {})
    return result
  }

  return { enqueue, current: () => trail, drain: async () => { await tail } }
}
