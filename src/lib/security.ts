// === SECURITY GATE — GROUP 1 ===
// Input gate. Runs TOBIRA registry against raw paste before anything
// reaches the API or state. This file must exist and be reviewed before
// InheritPanel, CollaboratorPanel, or extractor.ts are created (Group 4).
//
// GROUP 4 WIRING: call gate() from InheritPanel/CollaboratorPanel paste handlers.
// handleGateResult() in App.tsx handles escalate() and appendEntry() on GateResult.

import { scanPasteInput } from './tripwires'
import { INTEGRITY_STATES } from './integrity'
import type { IntegrityState, StateTransition } from './integrity'
import type { ScanResult } from './tripwires'

export type GateResult = {
  blocked: boolean
  scanResult: ScanResult
  recommendedTransition: StateTransition | null  // null = clean input, no transition needed
  findings: string[]
  charCount: number
}

const MAX_INPUT_CHARS = 8000

// Module-scope: O(1) severity lookup. Never use indexOf() inside loops.
const ORDER_INDEX: Record<string, number> = Object.fromEntries(
  (['ZANSHIN', 'UNHEIMLICH', 'WABI', 'EPOCHÉ'] as const).map((s, i) => [s, i])
)

// gate() — call this before any external input reaches API or state.
// Returns a GateResult. Never throws — caller decides what to do with the result.
export function gate(input: string): GateResult {
  const findings: string[] = []
  const charCount = input.length

  if (charCount > MAX_INPUT_CHARS) {
    return {
      blocked: true,
      scanResult: { fired: [], clean: false, secretsDetected: false },
      recommendedTransition: 'WABI',
      findings: [`Input exceeds ${MAX_INPUT_CHARS} character limit (${charCount} chars). Truncation could hide adversarial content — rejecting.`],
      charCount,
    }
  }

  const scanResult = scanPasteInput(input)
  let recommendedTransition: StateTransition | null = null

  for (const tobira of scanResult.fired) {
    findings.push(`[${tobira.auditCode}] ${tobira.message}`)  // always before any guard

    const incoming = ORDER_INDEX[tobira.transition]
    if (incoming === undefined) {
      findings.push('[SYS_ANOMALY] Unrecognized integrity transition — failing closed.')
      return { blocked: true, scanResult, recommendedTransition: 'EPOCHÉ', findings, charCount }
    }

    const current = recommendedTransition ? ORDER_INDEX[recommendedTransition] : -1
    if (incoming > current) recommendedTransition = tobira.transition
  }

  if (scanResult.secretsDetected) {
    findings.push('APOCRYPHA: Credential material detected. Content will not be transmitted.')
  }

  const blocked =
    recommendedTransition === 'EPOCHÉ' ||
    recommendedTransition === 'WABI'   ||
    scanResult.secretsDetected

  return { blocked, scanResult, recommendedTransition, findings, charCount }
}

// Utility: describe capability restrictions at a given state
export function capabilityReport(state: IntegrityState): string[] {
  const s = INTEGRITY_STATES[state]
  return [
    `Extraction: ${s.allowsExtraction ? 'permitted' : 'suspended'}`,
    `API calls: ${s.allowsApiCalls ? 'permitted' : 'suspended'}`,
    `State writes: ${s.allowsStateWrites ? 'permitted' : 'suspended'}`,
    `Patch application: ${s.allowsPatchApplication ? 'permitted' : 'suspended'}`,
  ]
}
