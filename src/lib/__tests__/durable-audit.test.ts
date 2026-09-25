// durable-audit.ts's whole design is "never throw, never block the local
// trail" — these tests exercise exactly that contract, plus the field
// mappings it's responsible for reconciling between STELE's local shapes
// (kebab-case actions, lowercase verbosity/hygiene, the accented 'EPOCHÉ')
// and stele-core's Prisma-enum shapes (SCREAMING_SNAKE, plain 'EPOCHE').
//
// BASE_URL is read from import.meta.env at module load time, so tests that
// need a configured backend re-import the module fresh after stubbing the
// env var — vi.resetModules() + a dynamic import, the standard Vitest
// pattern for this.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildDefaultState } from '@/data/defaults'
import type { AuditEntry } from '../audit'

const BACKEND = 'http://stele-core.test'

function baseEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    timestamp: '2026-09-24T00:00:00.000Z',
    action: 'session-start',
    sessionId: 'sess-1',
    integrityHash: 'a'.repeat(64),
    ...overrides,
  }
}

describe('durable-audit — unconfigured (VITE_STELE_CORE_URL unset)', () => {
  it('createDurableSession returns null without ever calling fetch', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { createDurableSession } = await import('../durable-audit')

    const result = await createDurableSession(buildDefaultState())

    expect(result).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('mirrorDurableEntry and endDurableSession are no-ops on a null session', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { mirrorDurableEntry, endDurableSession } = await import('../durable-audit')

    await mirrorDurableEntry(null, baseEntry())
    await endDurableSession(null, buildDefaultState())

    expect(fetchSpy).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

describe('durable-audit — configured', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_STELE_CORE_URL', BACKEND)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('createDurableSession posts to /api/sessions with mapped field casing', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ session: { id: 'sess-abc' }, token: 'tok-xyz' }),
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { createDurableSession } = await import('../durable-audit')

    const state = buildDefaultState()
    state.sessionMode = 'BUILD'
    state.outputTarget = 'claude-ai'
    state.verbosity = 'expanded'
    state.hygieneTrigger = 'on-copy'
    state.hygieneAfterN = 7
    state.activeProjectIds = ['p1', 'p2']

    const result = await createDurableSession(state)

    expect(result).toEqual({ id: 'sess-abc', token: 'tok-xyz' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(`${BACKEND}/api/sessions`)
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body).toEqual({
      sessionMode: 'BUILD',
      outputTarget: 'claude-ai',
      verbosity: 'EXPANDED',      // lowercase -> SCREAMING_SNAKE
      hygieneTrigger: 'ON_COPY',  // kebab-case -> SCREAMING_SNAKE
      hygieneAfterN: 7,
      activeProjectIds: ['p1', 'p2'],
    })
  })

  it('createDurableSession returns null on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const { createDurableSession } = await import('../durable-audit')

    expect(await createDurableSession(buildDefaultState())).toBeNull()
  })

  it('createDurableSession returns null rather than throwing on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { createDurableSession } = await import('../durable-audit')

    await expect(createDurableSession(buildDefaultState())).resolves.toBeNull()
  })

  it('mirrorDurableEntry maps the action and both integrity states, including EPOCHÉ -> EPOCHE', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchSpy)
    const { mirrorDurableEntry } = await import('../durable-audit')

    await mirrorDurableEntry(
      { id: 'sess-abc', token: 'tok-xyz' },
      baseEntry({
        action: 'tobira-fired',
        tobiraId: 'TW-004',
        tobiraCode: 'NARIKIRI-004',
        fromState: 'WABI',
        toState: 'EPOCHÉ',
        fieldsExtracted: ['sessionMode'],
        fieldsRejected: [],
        secretsDetected: true,
      })
    )

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(`${BACKEND}/api/sessions/sess-abc/events`)
    expect(init.headers.Authorization).toBe('Bearer tok-xyz')
    const body = JSON.parse(init.body)
    expect(body).toEqual({
      action: 'TOBIRA_FIRED',
      tobiraId: 'TW-004',
      tobiraCode: 'NARIKIRI-004',
      fromState: 'WABI',
      toState: 'EPOCHE',
      fieldsExtracted: ['sessionMode'],
      fieldsRejected: [],
      secretsDetected: true,
    })
  })

  it('mirrorDurableEntry never throws on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { mirrorDurableEntry } = await import('../durable-audit')

    await expect(
      mirrorDurableEntry({ id: 'sess-abc', token: 'tok-xyz' }, baseEntry())
    ).resolves.toBeUndefined()
  })

  it('endDurableSession PATCHes /:id/end with the mapped integrity state', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchSpy)
    const { endDurableSession } = await import('../durable-audit')

    const state = buildDefaultState()
    state.integrityState = 'EPOCHÉ'
    state.firedTobiraIds = ['TW-004']
    state.themeId = 'cipher-gothic'

    await endDurableSession({ id: 'sess-abc', token: 'tok-xyz' }, state)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe(`${BACKEND}/api/sessions/sess-abc/end`)
    expect(init.method).toBe('PATCH')
    const body = JSON.parse(init.body)
    expect(body).toEqual({
      integrityState: 'EPOCHE',
      firedTobiraIds: ['TW-004'],
      themeId: 'cipher-gothic',
    })
  })

  it('endDurableSession never throws on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { endDurableSession } = await import('../durable-audit')

    await expect(
      endDurableSession({ id: 'sess-abc', token: 'tok-xyz' }, buildDefaultState())
    ).resolves.toBeUndefined()
  })

  it('strips a trailing slash from VITE_STELE_CORE_URL', async () => {
    vi.stubEnv('VITE_STELE_CORE_URL', `${BACKEND}/`)
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ session: { id: 's' }, token: 't' }),
    })
    vi.stubGlobal('fetch', fetchSpy)
    const { createDurableSession } = await import('../durable-audit')

    await createDurableSession(buildDefaultState())

    expect(fetchSpy.mock.calls[0][0]).toBe(`${BACKEND}/api/sessions`)
  })
})
