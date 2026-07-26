import { describe, expect, it } from 'vitest'
import { escalate, INTEGRITY_STATES, type IntegrityState, type StateTransition } from '../integrity'

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
