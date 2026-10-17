// === DURABLE AUDIT MIRROR (stele-core) ===
//
// The audit trail already lives in memory (audit-queue.ts) — that local
// chain is what the UI reads and what drives EPOCHÉ enforcement, and it
// works with zero configuration. This module mirrors the same entries to
// stele-core's Postgres-backed ledger when one is configured, so evidence
// survives the tab closing (README's stated "session-scoped, dies with the
// tab" limit — this is what closes it).
//
// Strictly additive, never load-bearing: unconfigured, offline, CORS-blocked,
// or not-yet-deployed are all the same case — "no durable mirror this
// session" — and never interrupt the local trail or the gate/enforcement
// path that reads it. Every function here is infallible by construction: it
// catches, it does not throw.
//
// VITE_STELE_CORE_URL is a build-time Vite env var (see vite.config.ts's
// existing __STELE_VERSION__ define for the same mechanism) baked into the
// single-file bundle at `vite build` time — unset by default, so a build
// with no backend configured is simply inert. See .env.example.

import type { DirectiveState } from './types'
import type { AuditAction, AuditEntry, AuditTrail } from './audit'
import type { AuditQueue } from './audit-queue'
import type { IntegrityState } from './integrity'
import type { Verbosity, HygieneTrigger } from './types'

const BASE_URL = (import.meta.env.VITE_STELE_CORE_URL as string | undefined)?.replace(/\/$/, '')

export type DurableSession = { id: string; token: string }

// Local uses kebab-case (audit.ts); stele-core's AuditActionType enum uses
// SCREAMING_SNAKE (stele-core/src/schemas.ts). Both sides are authored
// independently and this table is the only place they're reconciled.
const ACTION_MAP: Record<AuditAction, string> = {
  'session-start':      'SESSION_START',
  'kohaku-extraction':  'KOHAKU_EXTRACTION',
  'tsugi-applied':      'TSUGI_APPLIED',
  'kiri-rejected':      'KIRI_REJECTED',
  'tobira-fired':       'TOBIRA_FIRED',
  'utsuroi-transition': 'UTSUROI_TRANSITION',
  'epoche-entered':     'EPOCHE_ENTERED',
}

const VERBOSITY_MAP: Record<Verbosity, string> = {
  dense: 'DENSE', standard: 'STANDARD', expanded: 'EXPANDED',
}

const HYGIENE_MAP: Record<HygieneTrigger, string> = {
  off: 'OFF', 'on-copy': 'ON_COPY', 'turn-based': 'TURN_BASED', manual: 'MANUAL',
}

// Local IntegrityState carries the accented 'EPOCHÉ'; stele-core's Prisma
// enum is plain ASCII 'EPOCHE'. Every other value matches byte-for-byte.
function mapIntegrityState(s: IntegrityState): string {
  return s === 'EPOCHÉ' ? 'EPOCHE' : s
}

export async function createDurableSession(state: DirectiveState): Promise<DurableSession | null> {
  if (!BASE_URL) return null
  try {
    const res = await fetch(`${BASE_URL}/api/sessions`, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionMode: state.sessionMode,
        outputTarget: state.outputTarget,
        verbosity: VERBOSITY_MAP[state.verbosity],
        hygieneTrigger: HYGIENE_MAP[state.hygieneTrigger],
        hygieneAfterN: state.hygieneAfterN,
        activeProjectIds: state.activeProjectIds,
      }),
    })
    if (!res.ok) return null
    const body: { session: { id: string }; token: string } = await res.json()
    return { id: body.session.id, token: body.token }
  } catch {
    return null
  }
}

export async function mirrorDurableEntry(session: DurableSession | null, entry: AuditEntry): Promise<void> {
  if (!session || !BASE_URL) return
  try {
    await fetch(`${BASE_URL}/api/sessions/${session.id}/events`, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({
        action: ACTION_MAP[entry.action],
        tobiraId: entry.tobiraId,
        tobiraCode: entry.tobiraCode,
        fromState: entry.fromState ? mapIntegrityState(entry.fromState) : undefined,
        toState: entry.toState ? mapIntegrityState(entry.toState) : undefined,
        fieldsExtracted: entry.fieldsExtracted ?? [],
        fieldsRejected: entry.fieldsRejected ?? [],
        secretsDetected: entry.secretsDetected ?? false,
      }),
    })
  } catch {
    // A dropped durable mirror entry is not a dropped LOCAL entry — the trail
    // the UI and EPOCHÉ enforcement read from (audit-queue.ts) is unaffected.
  }
}

// Closes the durable session on the one deliberate session boundary the app
// has (handleReset in App.tsx). There is no reliable tab-close signal this
// module hooks — a session ended only by closing the tab shows `endedAt:
// null` in stele-core forever, the same honest perimeter the local trail
// already has ("dies with the tab"), not a new gap this module introduces.
export async function endDurableSession(session: DurableSession | null, state: DirectiveState): Promise<void> {
  if (!session || !BASE_URL) return
  try {
    await fetch(`${BASE_URL}/api/sessions/${session.id}/end`, {
      method: 'PATCH',
      signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({
        integrityState: mapIntegrityState(state.integrityState as IntegrityState),
        firedTobiraIds: state.firedTobiraIds,
        themeId: state.themeId,
      }),
    })
  } catch {
    // Best-effort, same as above.
  }
}

/** One mirror per local session; its token and ordered tail never cross reset. */
export function createDurableMirror(state: DirectiveState) {
  const session = createDurableSession(state)
  let tail: Promise<void> = Promise.resolve()
  let submitted = 0
  let ended = false
  return {
    enqueue(trail: AuditTrail): void {
      if (ended || trail.sessionId !== state.sessionId) return
      const entries = trail.entries.slice(submitted)
      submitted = trail.entries.length
      tail = tail.then(async () => {
        const durable = await session
        for (const entry of entries) await mirrorDurableEntry(durable, entry)
      })
    },
    end(finalState: DirectiveState): Promise<void> {
      if (!ended) {
        ended = true
        tail = tail.then(async () => endDurableSession(await session, finalState))
      }
      return tail
    },
    drain: () => tail,
  }
}
export type DurableMirror = ReturnType<typeof createDurableMirror>

/** Flush already-queued local evidence even when reset supersedes its UI. */
export async function closeDurableMirror(
  queue: AuditQueue, mirror: DurableMirror | null, state: DirectiveState,
): Promise<void> {
  if (!mirror) return
  await queue.drain()
  mirror.enqueue(queue.current())
  await mirror.end(state)
}
