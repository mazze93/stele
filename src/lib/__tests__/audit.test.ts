import { describe, expect, it } from 'vitest'
import { appendEntry, createAuditTrail, verifyChain } from '../audit'

describe('audit hash chain', () => {
	it('verifies an untampered chain', async () => {
		let trail = createAuditTrail('TEST-1')
		trail = await appendEntry(trail, 'session-start')
		trail = await appendEntry(trail, 'tobira-fired', { tobiraId: 'TW-001', tobiraCode: 'KAPU-001' })
		trail = await appendEntry(trail, 'utsuroi-transition', { fromState: 'ZANSHIN', toState: 'EPOCHÉ' })
		expect(await verifyChain(trail)).toBe(true)
	})

	it('detects tampering with a past entry', async () => {
		let trail = createAuditTrail('TEST-2')
		trail = await appendEntry(trail, 'session-start')
		trail = await appendEntry(trail, 'tobira-fired', { tobiraId: 'TW-001' })
		const tampered = {
			...trail,
			entries: trail.entries.map((e, i) => (i === 0 ? { ...e, action: 'epoche-entered' as const } : e)),
		}
		expect(await verifyChain(tampered)).toBe(false)
	})

	it('detects a dropped entry', async () => {
		let trail = createAuditTrail('TEST-3')
		trail = await appendEntry(trail, 'session-start')
		trail = await appendEntry(trail, 'tobira-fired', { tobiraId: 'TW-004' })
		trail = await appendEntry(trail, 'epoche-entered')
		const dropped = { ...trail, entries: [trail.entries[0], trail.entries[2]] }
		expect(await verifyChain(dropped)).toBe(false)
	})
})
