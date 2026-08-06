// === INTEGRITY STATE MACHINE ===
// No imports from project code. Everything imports from here.
// The dependency graph is a strict DAG with integrity at the root.

export type IntegrityState = 'ZANSHIN' | 'UNHEIMLICH' | 'WABI' | 'EPOCHÉ'
export type StateTransition = 'UNHEIMLICH' | 'WABI' | 'EPOCHÉ'

export const INTEGRITY_STATES: Record<IntegrityState, {
  label: string
  glyph: string
  description: string
  color: string
  colorDim: string
  allowsExtraction: boolean
  allowsApiCalls: boolean
  allowsStateWrites: boolean
  allowsPatchApplication: boolean
}> = {
  ZANSHIN: {
    label: 'ZANSHIN', glyph: '残',
    description: 'Remaining mind. Alert wholeness. Active readiness.',
    color: '#4db8c4', colorDim: 'rgba(77,184,196,0.18)',
    allowsExtraction: true, allowsApiCalls: true,
    allowsStateWrites: true, allowsPatchApplication: true,
  },
  UNHEIMLICH: {
    label: 'UNHEIMLICH', glyph: '⌖',
    description: 'The uncanny. Familiar made strange. Soft signal detected.',
    color: '#d29922', colorDim: 'rgba(210,153,34,0.18)',
    allowsExtraction: true, allowsApiCalls: true,
    allowsStateWrites: true, allowsPatchApplication: true,
  },
  WABI: {
    label: 'WABI', glyph: '侘',
    description: 'Honest diminishment. Operating with known imperfection.',
    color: '#f0a030', colorDim: 'rgba(240,160,48,0.18)',
    allowsExtraction: false, allowsApiCalls: false,
    allowsStateWrites: true, allowsPatchApplication: false,
  },
  EPOCHÉ: {
    label: 'EPOCHÉ', glyph: 'ἐ',
    description: 'Deliberate suspension. The plug pulled to preserve what matters.',
    color: '#c85080', colorDim: 'rgba(200,80,128,0.18)',
    allowsExtraction: false, allowsApiCalls: false,
    allowsStateWrites: false, allowsPatchApplication: false,
  },
}

const ORDER: IntegrityState[] = ['ZANSHIN', 'UNHEIMLICH', 'WABI', 'EPOCHÉ']

// Always escalates — never de-escalates within a session
export function escalate(current: IntegrityState, transition: StateTransition): IntegrityState {
  return ORDER[Math.max(ORDER.indexOf(current), ORDER.indexOf(transition))]
}

// Non-cryptographic 32-bit display stamp for compiled-output headers.
// NOT tamper-evident — the audit trail hash chain (audit.ts, SHA-256) is
// the integrity mechanism. Renamed from integrityHash to avoid overclaiming.
export function sessionStamp(state: IntegrityState, sessionId: string, ts: number): string {
  const raw = `${state}:${sessionId}:${ts}`
  let h = 0
  for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h |= 0 }
  return Math.abs(h).toString(16).toUpperCase().padStart(8, '0')
}

const BASE36_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function generateSessionId(): string {
  const bytes = new Uint8Array(4)
  globalThis.crypto.getRandomValues(bytes)
  // Map each byte to one base-36 character directly, rather than converting
  // whole bytes to base-36 text and concatenating: a byte's base-36 form is
  // 1-2 digits wide and the "tens" digit only ever reaches 0-7 (255 max),
  // so naive concatenation biases every other character to 8 possible values
  // instead of 36 and silently drops half the random bytes on top of it.
  const randomPart = Array.from(bytes, b => BASE36_ALPHABET[b % 36]).join('')
  return `${Date.now().toString(36).toUpperCase()}-${randomPart}`
}
