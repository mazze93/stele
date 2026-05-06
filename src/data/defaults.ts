import type { DirectiveState, OutputSection, EscalationTrigger } from '@/lib/types'
import { generateSessionId } from '@/lib/integrity'
import { BUILT_IN_MODES, findMode } from '@/data/modes'

export const DEFAULT_SECTIONS: OutputSection[] = [
  { id: 'assumptions', label: 'Assumptions',         enabled: true },
  { id: 'building',    label: "What I'm building",   enabled: true },
  { id: 'code',        label: 'Code',                enabled: true },
  { id: 'rationale',   label: 'Rationale + watch-outs', enabled: true },
  { id: 'usage',       label: 'Usage',               enabled: true },
  { id: 'audit',       label: 'Audit',               enabled: true },
  { id: 'test',        label: 'Test checklist',      enabled: true },
]

export const DEFAULT_ESCALATIONS: EscalationTrigger[] = [
  // Universal — always included regardless of project
  { id: 'data-unclassified',    label: 'Data handling without classification → ask before generating',                   locked: false, enabled: true,  scope: 'universal' },
  { id: 'crypto-no-compliance', label: 'Encryption/identity/payment without compliance mention → pause + review',        locked: false, enabled: true,  scope: 'universal' },
  { id: 'undocumented-deps',    label: '>3 undocumented deps introduced → suggest modular refactor',                     locked: false, enabled: true,  scope: 'universal' },
  { id: 'optim-no-a11y',        label: 'Optimization without a11y confirmation → confirm WCAG AA first',                 locked: false, enabled: true,  scope: 'universal' },
  // Project-scoped: context-synapse
  { id: 'context-inference',    label: 'Operational context inference (context-synapse) → HARD STOP, state reason',      locked: true,  enabled: true,  scope: 'project', projectIds: ['context-synapse'] },
  // Project-scoped: secure-pride
  { id: 'sogi-boundary',        label: 'Unclear SOGI data boundary → escalate, do not guess',                           locked: true,  enabled: true,  scope: 'project', projectIds: ['secure-pride'] },
  { id: 'sogi-inference',       label: 'Code that could infer SOGI attributes from behavioral data → refuse',            locked: true,  enabled: true,  scope: 'project', projectIds: ['secure-pride'] },
  // Project-scoped: thesis-pipeline
  { id: 'irb-identifiable',     label: 'Identifiable output without spatial masking (thesis-pipeline) → refuse',        locked: true,  enabled: true,  scope: 'project', projectIds: ['thesis-pipeline'] },
  // Project-scoped: directive-remixer / STELE
  { id: 'dr-sequencing',        label: 'Attack surface opened before security gate exists (DR) → refuse, state sequencing requirement', locked: true, enabled: true, scope: 'project', projectIds: ['directive-remixer'] },
  { id: 'dr-lexicon',           label: 'Lexicon vocabulary violated in compiled output strings (DR) → flag and rewrite', locked: false, enabled: true,  scope: 'project', projectIds: ['directive-remixer'] },
  { id: 'dr-audit-inert',       label: 'Integrity state transitions without audit trail entry (DR) → treat as YUGAMI signal', locked: true, enabled: true, scope: 'project', projectIds: ['directive-remixer'] },
]

export const SESSION_PRESETS: Record<string, {
  sections: string[]; verbosity: 'dense' | 'standard' | 'expanded'; description: string
}> = Object.fromEntries(
  BUILT_IN_MODES.map(m => [m.id, { sections: m.sections, verbosity: m.verbosity, description: m.description }])
)

export function buildDefaultState(): DirectiveState {
  return {
    themeId: 'cipher-gothic',
    integrityState: 'ZANSHIN',
    firedTobiraIds: [],
    sessionId: generateSessionId(),
    activeProjectIds: [],
    sessionMode: 'BUILD',
    outputTarget: 'claude-ai',
    verbosity: 'standard',
    hygieneTrigger: 'on-copy',
    hygieneAfterN: 10,
    outputSections: DEFAULT_SECTIONS.map(s => ({ ...s })),
    escalationTriggers: DEFAULT_ESCALATIONS.map(e => ({ ...e })),
    openQuestions: [],
    customAppend: '',
    userModes: [],
    projectNarratives: {},
  }
}

export function applySessionPreset(state: DirectiveState, modeId: string): DirectiveState {
  const mode = findMode(modeId, state.userModes)
  if (!mode) return state
  return {
    ...state,
    sessionMode: modeId,
    verbosity: mode.verbosity,
    outputSections: state.outputSections.map(s => ({ ...s, enabled: mode.sections.includes(s.id) })),
  }
}

export function activeTriggersForProjects(
  triggers: EscalationTrigger[],
  activeProjectIds: string[],
): EscalationTrigger[] {
  return triggers.filter(t => {
    if (!t.enabled) return false
    if (t.scope === 'universal') return true
    return t.projectIds?.some(id => activeProjectIds.includes(id)) ?? false
  })
}
