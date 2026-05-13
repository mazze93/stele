import type { Project, Tessera, DirectiveState } from '@/lib/types'
import type { IntegrityState } from '@/lib/integrity'
import { INTEGRITY_STATES } from '@/lib/integrity'
import { STELE_VERSION } from '@/lib/version'

export type ConfoundStatus = {
  status:           'unaddressed' | 'flagged-by-heuristic' | 'human-reviewed'
  note?:            string
  heuristicSource?: string
}

export type ConfoundsBlock = {
  policyEngineTargeting:   ConfoundStatus
  baselineDrift:           ConfoundStatus
  timingOracle:            ConfoundStatus
  fakeMultiParty:          ConfoundStatus
  fragilityMetaMonitoring: ConfoundStatus
  palimpsestKotodama:      ConfoundStatus
}

export type ProjectNarrativeExport = {
  steleVersion:   string
  exportedAt:     string
  projectId:      string
  sessionId:      string
  integrityState: IntegrityState
  narrative: {
    identity?:            string
    philosophy?:          string
    buildSequencing?:     string
    unstatedConstraints?: string
  }
  architecture: {
    posture:        string
    stack:          string
    hardStops:      string[]
    tesserae:       Array<{ module: string; missingHalf: string; group: number }>
    compliance:     string[]
    confounds:      ConfoundsBlock
    haltConditions: string[]
  }
}

const CONFOUND_KEYWORDS: Record<keyof ConfoundsBlock, string[]> = {
  policyEngineTargeting:   ['policy engine', 'trust issuer', 'signing key'],
  baselineDrift:           ['baseline', 'rolling window', 'pinned'],
  timingOracle:            ['backoff', 'retry', 'timing'],
  fakeMultiParty:          ['multi-party', 'approval', 'out-of-band'],
  fragilityMetaMonitoring: ['watchdog', 'meta-monitor', 'fragility gate'],
  palimpsestKotodama:      ['prompt injection', 'palimpsest', 'kotodama'],
}

function checkHardStop(hardStops: string[], keywords: string[]): string | null {
  for (const stop of hardStops) {
    const lower = stop.toLowerCase()
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return stop
    }
  }
  return null
}

export function buildConfoundsBlock(project: Project): ConfoundsBlock {
  const result = {} as ConfoundsBlock
  for (const key of Object.keys(CONFOUND_KEYWORDS) as Array<keyof ConfoundsBlock>) {
    const match = checkHardStop(project.hardStops, CONFOUND_KEYWORDS[key])
    result[key] = match
      ? { status: 'flagged-by-heuristic', heuristicSource: match }
      : { status: 'unaddressed' }
  }
  return result
}

function applyConfoundNotes(
  base: ConfoundsBlock,
  notes: Record<string, string>,
): ConfoundsBlock {
  const result = { ...base } as ConfoundsBlock
  for (const key of Object.keys(notes) as Array<keyof ConfoundsBlock>) {
    const note = notes[key]?.trim()
    if (!note) continue
    result[key] = { ...result[key], status: 'human-reviewed', note }
  }
  return result
}

const HALT_STATES: IntegrityState[] = ['WABI', 'EPOCHÉ']

function deriveHaltConditions(): string[] {
  return HALT_STATES.map(s => `${INTEGRITY_STATES[s].label}: ${INTEGRITY_STATES[s].description}`)
}

export function buildProjectNarrativeExport(
  project:       Project,
  state:         DirectiveState,
  confoundNotes: Record<string, string>,
): ProjectNarrativeExport {
  const narrative = state.projectNarratives?.[project.id] ?? {}
  const baseConfounds = buildConfoundsBlock(project)
  const confounds = applyConfoundNotes(baseConfounds, confoundNotes)

  const tesserae: Array<{ module: string; missingHalf: string; group: number }> =
    (project.tesserae ?? []).map((t: Tessera) => ({
      module:      t.module,
      missingHalf: t.missingHalf,
      group:       t.group,
    }))

  return {
    steleVersion:   STELE_VERSION,
    exportedAt:     new Date().toISOString(),
    projectId:      project.id,
    sessionId:      state.sessionId,
    integrityState: state.integrityState,
    narrative: {
      identity:            narrative.identity,
      philosophy:          narrative.philosophy,
      buildSequencing:     narrative.buildSequencing,
      unstatedConstraints: narrative.unstatedConstraints,
    },
    architecture: {
      posture:        project.posture,
      stack:          project.stack,
      hardStops:      project.hardStops,
      tesserae,
      compliance:     project.compliance,
      confounds,
      haltConditions: deriveHaltConditions(),
    },
  }
}

export function downloadNarrativeExport(exported: ProjectNarrativeExport): void {
  const date = exported.exportedAt.slice(0, 10)
  const filename = `stele-narrative-${exported.projectId}-${date}.json`
  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
