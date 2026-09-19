import { describe, it, expect } from 'vitest'
import { createAuditQueue } from '../audit-queue'
import { createAuditTrail, appendEntry, verifyChain } from '../audit'
import type { AuditTrail } from '../audit'

// The race this exists to prevent is a LOST UPDATE, not a corrupt chain. Two
// writers each read the trail, await, and write back; the later write wins and
// the other entry is gone. The survivor still verifies — it is internally
// consistent, merely shorter — so neither verifyChain() nor a hash check can
// detect it. Only counting what was asked for against what landed can.

const trail = () => createAuditTrail('queue-test')

describe('audit queue', () => {
  it('keeps every entry when writers overlap', async () => {
    const q = createAuditQueue(trail())
    const N = 25

    // Fired together, deliberately: no awaiting between enqueues.
    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        q.enqueue(t => appendEntry(t, 'tobira-fired', { tobiraId: `TW-${i}` }))),
    )

    expect(q.current().entries).toHaveLength(N)
    const ids = q.current().entries.map(e => e.tobiraId)
    expect(new Set(ids).size).toBe(N)          // nothing overwritten
    expect(await verifyChain(q.current())).toBe(true)
  })

  it('preserves enqueue order', async () => {
    const q = createAuditQueue(trail())
    await Promise.all(
      ['a', 'b', 'c', 'd'].map(id =>
        q.enqueue(t => appendEntry(t, 'tobira-fired', { tobiraId: id }))),
    )
    expect(q.current().entries.map(e => e.tobiraId)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('reads the trail inside its turn, not at enqueue time', async () => {
    // The mechanism, asserted directly: a writer queued before another has
    // completed must still see that other writer's entry.
    const q = createAuditQueue(trail())
    const seen: number[] = []
    const spy = (t: AuditTrail) => { seen.push(t.entries.length); return appendEntry(t, 'session-start') }

    const a = q.enqueue(spy)
    const b = q.enqueue(spy)   // enqueued while `a` is still in flight
    await Promise.all([a, b])

    expect(seen).toEqual([0, 1])
  })

  it('a failed write does not wedge the queue behind it', async () => {
    const q = createAuditQueue(trail())
    const boom = q.enqueue(async () => { throw new Error('append failed') })
    await expect(boom).rejects.toThrow('append failed')

    await q.enqueue(t => appendEntry(t, 'session-start'))
    expect(q.current().entries).toHaveLength(1)
  })

  it('drain resolves only once every queued write has settled', async () => {
    const q = createAuditQueue(trail())
    for (let i = 0; i < 5; i++) q.enqueue(t => appendEntry(t, 'tobira-fired', { tobiraId: `t${i}` }))
    await q.drain()
    expect(q.current().entries).toHaveLength(5)
  })
})

// === supersession: the reset race ===
//
// handleReset() replaces the queue, but a write already hashing on the old one
// still resolves afterwards. Publishing it would repaint the PREVIOUS session's
// trail over the fresh one — and reset is the only exit from EPOCHÉ lockout, so
// the operator would be shown the records of the session they just left.
//
// App.tsx guards this by passing the originating queue to publish() and
// discarding the result if the ref has moved on. That component cannot be
// rendered here, so this models the same shape against the real queue to prove
// the identity check is sufficient — the source gate in evals/ separately
// asserts App.tsx still has it and that no call site bypasses it.

describe('supersession across reset', () => {
  it('a write in flight when the queue is replaced is not published', async () => {
    const ref = { current: createAuditQueue(trail()) }        // models auditQueueRef
    let published: AuditTrail | null = null
    const publish = (from: typeof ref.current, t: AuditTrail) => {
      if (ref.current !== from) return
      published = t
    }

    const origin = ref.current
    let release!: () => void
    const held = new Promise<void>(r => { release = r })

    const inFlight = origin
      .enqueue(async t => { await held; return appendEntry(t, 'tobira-fired', { tobiraId: 'OLD' }) })
      .then(t => publish(origin, t))

    // Operator resets while that write is still hashing.
    const freshTrail = createAuditTrail('session-2')
    ref.current = createAuditQueue(freshTrail)
    publish(ref.current, freshTrail)
    expect(published).toBe(freshTrail)

    release()
    await inFlight

    // The old write completed, and was discarded rather than painted over.
    expect(published).toBe(freshTrail)
    expect((published as unknown as AuditTrail).entries).toHaveLength(0)
    expect(origin.current().entries.map(e => e.tobiraId)).toEqual(['OLD'])
    expect(ref.current.current().entries).toHaveLength(0)
  })

  it('writes on the CURRENT queue still publish normally after a reset', async () => {
    const ref = { current: createAuditQueue(trail()) }
    let published: AuditTrail | null = null
    const publish = (from: typeof ref.current, t: AuditTrail) => {
      if (ref.current !== from) return
      published = t
    }

    ref.current = createAuditQueue(createAuditTrail('session-2'))
    const queue = ref.current
    publish(queue, await queue.enqueue(t => appendEntry(t, 'session-start')))

    expect(published).not.toBeNull()
    expect((published as unknown as AuditTrail).entries).toHaveLength(1)
  })
})
