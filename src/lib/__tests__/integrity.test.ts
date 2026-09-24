import { describe, expect, it } from 'vitest'
import { escalate, generateSessionId, INTEGRITY_STATES, type IntegrityState, type StateTransition } from '../integrity'

const STATES: IntegrityState[] = ['ZANSHIN', 'UNHEIMLICH', 'WABI', 'EPOCHÉ']
const TRANSITIONS: StateTransition[] = ['UNHEIMLICH', 'WABI', 'EPOCHÉ']

describe('escalate() is monotonic', () => {
	it('never de-escalates from any state', () => {
		for (const current of STATES) {
			for (const t of TRANSITIONS) {
				const next = escalate(current, t)
				expect(STATES.indexOf(next)).toBeGreaterThanOrEqual(STATES.indexOf(current))
			}
		}
	})

	it('is idempotent at the same severity', () => {
		for (const t of TRANSITIONS) {
			expect(escalate(escalate('ZANSHIN', t), t)).toBe(escalate('ZANSHIN', t))
		}
	})

	it('EPOCHÉ is absorbing — nothing escapes it', () => {
		for (const t of TRANSITIONS) expect(escalate('EPOCHÉ', t)).toBe('EPOCHÉ')
	})
})

describe('capability table', () => {
	it('capabilities only shrink as severity rises', () => {
		const caps = ['allowsExtraction', 'allowsApiCalls', 'allowsStateWrites', 'allowsPatchApplication'] as const
		for (const cap of caps) {
			let prev = true
			for (const s of STATES) {
				const cur = INTEGRITY_STATES[s][cap]
				expect(!prev && cur, `${cap} re-enabled at ${s}`).toBe(false)
				prev = cur
			}
		}
	})

	it('EPOCHÉ denies everything', () => {
		const e = INTEGRITY_STATES['EPOCHÉ']
		expect(e.allowsExtraction || e.allowsApiCalls || e.allowsStateWrites || e.allowsPatchApplication).toBe(false)
	})
})

describe('generateSessionId()', () => {
	it('matches TIMESTAMP-XXXX shape with a 4-char base-36 suffix', () => {
		for (let i = 0; i < 50; i++) {
			expect(generateSessionId()).toMatch(/^[0-9A-Z]+-[0-9A-Z]{4}$/)
		}
	})

	it('uses the full base-36 range at every suffix position, not a biased subset', () => {
		// Regression guard: an earlier crypto.getRandomValues-based fix mapped each
		// random byte to base-36 text and concatenated, which put only 0-7 (not the
		// full 0-9A-Z range) in every other character position, since a byte's
		// "tens" digit never exceeds floor(255/36)=7.
		const seen: Set<string>[] = [new Set(), new Set(), new Set(), new Set()]
		for (let i = 0; i < 2000; i++) {
			const suffix = generateSessionId().split('-')[1]
			for (let pos = 0; pos < 4; pos++) seen[pos].add(suffix[pos])
		}
		for (const s of seen) expect(s.size).toBeGreaterThan(8)
	})
})
