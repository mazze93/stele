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
