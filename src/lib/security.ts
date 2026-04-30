// === SECURITY GATE — GROUP 1 ===
// Input gate. Runs TOBIRA registry against raw paste before anything
// reaches the API or state. This file must exist and be reviewed before
// InheritPanel, CollaboratorPanel, or extractor.ts are created (Group 4).
//
// GROUP 2 WIRING TODO:
//   - Import and call gate() from InheritPanel paste handler
//   - Import and call gate() from CollaboratorPanel input handler
//   - On GateResult.blocked === true, escalate() integrity state and fire TOBIRA
//   - appendEntry() to audit trail for every gate() call

import { scanInput } from './tripwires'
import { INTEGRITY_STATES } from './integrity'
import type { IntegrityState } from './integrity'
import type { ScanResult } from './tripwires'

export type GateResult = {
  blocked: boolean
  scanResult: ScanResult
  // Recommended state transition — caller decides whether to apply
  recommendedTransition: IntegrityState
  // Human-readable summary of findings for UI display
  findings: string[]
  // Character count checked — length enforcement
  charCount: number
}

const MAX_INPUT_CHARS = 8000  // enough for any real project file

// gate() — call this before any external input reaches API or state
// Returns a GateResult. Never throws — caller decides what to do with the result.
export function gate(input: string): GateResult {
  const findings: string[] = []
  const charCount = input.length

  // Length cap
  if (charCount > MAX_INPUT_CHARS) {
    return {
      blocked: true,
      scanResult: { fired: [], clean: false, secretsDetected: false },
      recommendedTransition: 'WABI',
      findings: [`Input exceeds ${MAX_INPUT_CHARS} character limit (${charCount} chars). Truncation could hide adversarial content — rejecting.`],
      charCount,
    }
  }

  const scanResult = scanInput(input)

  // Determine highest severity transition from fired TOBIRA
  let recommendedTransition: IntegrityState = 'ZANSHIN'
  const ORDER: IntegrityState[] = ['ZANSHIN', 'UNHEIMLICH', 'WABI', 'EPOCHÉ']

  for (const tobira of scanResult.fired) {
    const idx = ORDER.indexOf(tobira.transition)
    if (idx > ORDER.indexOf(recommendedTransition)) {
      recommendedTransition = ORDER[idx]
    }
    findings.push(`[${tobira.auditCode}] ${tobira.message}`)
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
