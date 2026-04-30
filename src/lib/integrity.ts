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

export function integrityHash(state: IntegrityState, sessionId: string, ts: number): string {
  const raw = `${state}:${sessionId}:${ts}`
  let h = 0
  for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h |= 0 }
  return Math.abs(h).toString(16).toUpperCase().padStart(8, '0')
}

export function generateSessionId(): string {
  return `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`
}
