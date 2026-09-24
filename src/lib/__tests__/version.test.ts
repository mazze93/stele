// Guards the wiring, not the number. STELE_VERSION is injected by vite's
// `define` from package.json; if that block is removed or renamed the constant
// silently becomes undefined and every narrative export ships without
// provenance. package.json is authoritative because it is what `git tag v*`
// and release.yml publish against.
import { describe, expect, it } from 'vitest'
import { STELE_VERSION } from '../version'
import pkg from '../../../package.json'

describe('STELE_VERSION', () => {
	it('is injected, not undefined', () => {
		expect(STELE_VERSION).toBeTypeOf('string')
		expect(STELE_VERSION).toMatch(/^\d+\.\d+\.\d+/)
	})

	it('matches the version release.yml actually publishes', () => {
		expect(STELE_VERSION).toBe(pkg.version)
	})
})
