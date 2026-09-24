// === UTSUROI AUDIT TRAIL ===
// Always-on. No opt-out. Session-scoped.
// secretsDetected is boolean only — never log what was found.
// integrityHash is SHA-256 over prevHash + event content — a tamper-evident chain.

import type { IntegrityState } from './integrity'

export type AuditAction =
  | 'session-start'
  | 'kohaku-extraction'
  | 'tsugi-applied'
  | 'kiri-rejected'
  | 'tobira-fired'
  | 'utsuroi-transition'
  | 'epoche-entered'

export type AuditEntry = {
  timestamp: string
  action: AuditAction
  tobiraId?: string
  tobiraCode?: string
  fromState?: IntegrityState
  toState?: IntegrityState
  fieldsExtracted?: string[]
  fieldsRejected?: string[]
  secretsDetected?: boolean
  integrityHash: string
  sessionId: string
}

export type AuditTrail = {
  sessionId: string
  sessionStart: string
  entries: AuditEntry[]
  currentState: IntegrityState
}

export type AuditExtras = Omit<Partial<AuditEntry>, 'integrityHash' | 'timestamp' | 'action' | 'sessionId'>

const GENESIS_HASH = '0'.repeat(64)

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Part of the preimage — see stele-core/src/chain.ts. Must move in lockstep
// with the server encoder; the two chains are independent but share a shape.
const CHAIN_VERSION = 'v2'

// Length-prefixed rather than joined on '|'. Pasted content reaches these
// fields, so a delimiter appearing inside a value would make two different
// events hash identically — the encoding has to be injective or the chain
// stops being evidence. `${s.length}:${s}` reads back unambiguously.
function field(s: string): string {
  return `${s.length}:${s}`
}

function list(xs: string[] | undefined): string {
  return field((xs ?? []).map(field).join(''))
}

function chainInput(prevHash: string, action: AuditAction, extras: AuditExtras, sessionId: string, ts: string): string {
  return CHAIN_VERSION
    + field(prevHash)
    + field(action)
    + field(extras.tobiraId ?? '')
    + field(extras.tobiraCode ?? '')
    + field(extras.fromState ?? '')
    + field(extras.toState ?? '')
    + field(String(extras.secretsDetected ?? ''))
    + list(extras.fieldsExtracted)
    + list(extras.fieldsRejected)
    + field(sessionId)
    + field(ts)
}

export function createAuditTrail(sessionId: string): AuditTrail {
  return { sessionId, sessionStart: new Date().toISOString(), entries: [], currentState: 'ZANSHIN' }
}

export async function appendEntry(
  trail: AuditTrail,
  action: AuditAction,
  extras: AuditExtras = {},
): Promise<AuditTrail> {
  const prevHash = trail.entries.at(-1)?.integrityHash ?? GENESIS_HASH
  const ts = new Date().toISOString()
  const hash = await sha256(chainInput(prevHash, action, extras, trail.sessionId, ts))
  return {
    ...trail,
    entries: [...trail.entries, { timestamp: ts, action, sessionId: trail.sessionId, ...extras, integrityHash: hash }],
  }
}

export async function verifyChain(trail: AuditTrail): Promise<boolean> {
  let prevHash = GENESIS_HASH
  for (const entry of trail.entries) {
    const { integrityHash, timestamp, action, sessionId: _sid, ...rest } = entry
    const expected = await sha256(chainInput(prevHash, action, rest, trail.sessionId, timestamp))
    if (expected !== integrityHash) return false
    prevHash = integrityHash
  }
  return true
}

export function renderAuditMarkdown(trail: AuditTrail): string {
  const lines = [
    '## UTSUROI — Audit Trail', '',
    `Session: \`${trail.sessionId}\`  `,
    `Started: ${trail.sessionStart}  `,
    `State: **${trail.currentState}**`, '',
    '| time | action | tobira | hash |',
    '|------|--------|--------|------|',
  ]
  for (const e of trail.entries) {
    lines.push(`| ${e.timestamp.split('T')[1]?.split('.')[0] ?? '—'} | ${e.action} | ${e.tobiraCode ?? '—'} | \`${e.integrityHash.slice(0, 16)}…\` |`)
  }
  return lines.join('\n')
}

export function renderAuditInline(trail: AuditTrail, hash: string): string {
  return `UTSUROI [${trail.sessionId} · ${trail.currentState} · ${hash.slice(0, 12)}]`
}
