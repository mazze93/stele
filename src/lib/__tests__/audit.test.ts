import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

	// Regression: the encoding used to join fields on '|', which is not
	// injective — a '|' inside tobiraId could impersonate a field boundary, so
	// shifting content across the tobiraId/tobiraCode seam produced an identical
	// digest and the tampered entry still verified. Same defect for ',' inside
	// the array fields. Length-prefixing closed both.
	//
	// The clock is frozen deliberately. appendEntry() binds a fresh timestamp
	// into every hash, so without this the two digests would differ for that
	// reason alone and the test would pass while proving nothing about the
	// encoding. Holding ts and sessionId equal leaves field content as the only
	// difference — which is the property under test.
	describe('encoding is injective', () => {
		beforeEach(() => {
			vi.useFakeTimers()
			vi.setSystemTime(new Date('2026-08-04T00:00:00.000Z'))
		})
		afterEach(() => {
			vi.useRealTimers()
		})

		// The witness has to move the boundary without changing how many
		// separators there are. Emptying a field instead ('KAPU|001' + '') is
		// not a collision — it drops a character, so the two preimages differ
		// by one '|' and the old encoding survives it by accident.
		it('does not collide when a field contains the old delimiter', async () => {
			const left = await appendEntry(createAuditTrail('TEST-4'), 'tobira-fired', {
				tobiraId: 'KAPU',
				tobiraCode: '001|NARIKIRI',
			})
			const right = await appendEntry(createAuditTrail('TEST-4'), 'tobira-fired', {
				tobiraId: 'KAPU|001',
				tobiraCode: 'NARIKIRI',
			})
			expect(right.entries[0].integrityHash).not.toBe(left.entries[0].integrityHash)
		})

		it('does not collide when an array element contains a comma', async () => {
			const two = await appendEntry(createAuditTrail('TEST-5'), 'kohaku-extraction', {
				fieldsExtracted: ['stack', 'posture'],
			})
			const one = await appendEntry(createAuditTrail('TEST-5'), 'kohaku-extraction', {
				fieldsExtracted: ['stack,posture'],
			})
			expect(one.entries[0].integrityHash).not.toBe(two.entries[0].integrityHash)
		})
	})
})
