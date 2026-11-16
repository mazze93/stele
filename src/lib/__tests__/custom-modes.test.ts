import { describe, expect, it } from 'vitest'
import { buildDefaultState, applySessionPreset } from '@/data/defaults'
import { BUILT_IN_MODES } from '@/data/modes'
import { compile } from '../compiler'
import { validatePatch } from '../extraction-schema'

describe('operator-authored modes reach compiled output without extraction authority', () => {
  it('applies custom sections and verbosity while preserving governance and built-ins', () => {
    const initial = buildDefaultState()
    const builtinSnapshot = JSON.stringify(BUILT_IN_MODES)
    const mode = { id: 'user-test', label: 'Release review', builtIn: false, forkedFrom: 'REVIEW', sections: ['audit'], verbosity: 'expanded' as const, description: 'Review the release evidence.' }
    const state = applySessionPreset({ ...initial, userModes: [mode] }, mode.id)
    expect(state.verbosity).toBe('expanded')
    expect(state.outputSections.filter(section => section.enabled).map(section => section.id)).toEqual(['audit'])
    expect(state.escalationTriggers).toEqual(initial.escalationTriggers)
    expect(state.integrityState).toBe(initial.integrityState)
    expect(JSON.stringify(BUILT_IN_MODES)).toBe(builtinSnapshot)
    expect(compile(state)).toContain('OUTPUT FORMAT [Release review]')
    expect(compile(state)).toContain('1. Audit')
  })
  it('rejects automated mode authorship rather than silently applying it', () => {
    const result = validatePatch({ userModes: [], verbosity: 'dense' })
    expect(result.valid).toBe(false)
    expect(result.forbiddenFields).toContain('userModes')
    expect(result.patch).toEqual({})
  })
})
