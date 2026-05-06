// === STELE TYPE SYSTEM ===
// All types for the directive compiler and integrity telemetry tool.
// The lexicon is load-bearing — see CLAUDE.md for vocabulary constraints.

import type { IntegrityState } from './integrity'
import type { CustomMode } from '@/data/modes'
export type { IntegrityState }
export type { CustomMode }

export type Posture = 'MAX' | 'HIGH' | 'CREATIVE' | 'RESEARCH' | 'STANDARD' | 'GUARDIAN'
export type SessionMode = string
export type Verbosity = 'dense' | 'standard' | 'expanded'
export type OutputTarget = 'claude-ai' | 'claude-md-global' | 'claude-md-project'
export type HygieneTrigger = 'off' | 'on-copy' | 'turn-based' | 'manual'

// TESSERA — a module that compiles and exports correctly but whose connection
// to the live system is dormant. Neither half of the guest-friend bond has
// been joined yet. Distinct from openQuestions (design decisions) — a Tessera
// is topological not epistemic: the thing exists, the wiring does not.
export type Tessera = {
  id: string
  module: string          // what exists, e.g. 'escalate() in integrity.ts'
  missingHalf: string     // what would join it, e.g. 'call site in App.tsx'
  blockedBy?: string      // sequencing dependency if any
  group: 1 | 2 | 3 | 4 | 5  // which build group completes the join
}

export type Project = {
  id: string
  label: string
  scope: string
  stack: string
  posture: Posture
  compliance: string[]
  hardStops: string[]
  openQuestions: string[]
  tesserae: Tessera[]            // unjoined implementations
  root: string
  // Narrative fields — AI-authored via CollaboratorPanel, developer-reviewed
  // These are the fields developers can't easily articulate from inside the work
  identity?: string              // what this thing is philosophically
  philosophy?: string            // the values encoded in its architecture
  buildSequencing?: string       // why the order is the order
  unstatedConstraints?: string   // what the code implies but doesn't say
}

export type OutputSection = {
  id: string
  label: string
  enabled: boolean
}

export type EscalationTrigger = {
  id: string
  label: string
  locked: boolean
  enabled: boolean
  scope: 'universal' | 'project'
  projectIds?: string[]
}

export type OpenQuestion = {
  id: string
  projectId: string
  text: string
}

export type DirectiveState = {
  themeId: string
  integrityState: IntegrityState
  firedTobiraIds: string[]
  sessionId: string
  activeProjectIds: string[]
  sessionMode: SessionMode
  outputTarget: OutputTarget
  verbosity: Verbosity
  hygieneTrigger: HygieneTrigger
  hygieneAfterN: number
  outputSections: OutputSection[]
  escalationTriggers: EscalationTrigger[]
  openQuestions: OpenQuestion[]
  customAppend: string
  userModes: CustomMode[]
  projectNarratives: Record<string, {
    identity?: string
    philosophy?: string
    buildSequencing?: string
    unstatedConstraints?: string
  }>
}
