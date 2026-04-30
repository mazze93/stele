// === UTSUROI AUDIT TRAIL ===
// Always-on. No opt-out. Session-scoped.
// secretsDetected is boolean only — never log what was found.

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

export function createAuditTrail(sessionId: string): AuditTrail {
  return { sessionId, sessionStart: new Date().toISOString(), entries: [], currentState: 'ZANSHIN' }
}

export function appendEntry(
  trail: AuditTrail,
  action: AuditAction,
  extras: Partial<AuditEntry> & { integrityHash: string },
): AuditTrail {
  return {
    ...trail,
    entries: [...trail.entries, { timestamp: new Date().toISOString(), action, sessionId: trail.sessionId, ...extras }],
  }
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
    lines.push(`| ${e.timestamp.split('T')[1]?.split('.')[0] ?? '—'} | ${e.action} | ${e.tobiraCode ?? '—'} | \`${e.integrityHash}\` |`)
  }
  return lines.join('\n')
}

export function renderAuditInline(trail: AuditTrail, hash: string): string {
  return `UTSUROI [${trail.sessionId} · ${trail.currentState} · ${hash}]`
}
