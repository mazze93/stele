// === CUSTOM MODES REGISTRY ===
// Source of truth for session modes. Built-in modes are protected from deletion.
// User modes can be forked from any existing mode.

export type CustomMode = {
  id: string
  label: string
  builtIn: boolean
  forkedFrom?: string
  sections: string[]
  verbosity: 'dense' | 'standard' | 'expanded'
  description: string
}

export const BUILT_IN_MODES: CustomMode[] = [
  {
    id: 'PLAN', label: 'PLAN', builtIn: true,
    sections: ['assumptions', 'building', 'rationale'],
    verbosity: 'standard',
    description: 'Architecture + decision surface. No code. Full rationale.',
  },
  {
    id: 'BUILD', label: 'BUILD', builtIn: true,
    sections: ['assumptions', 'building', 'code', 'rationale', 'usage', 'test'],
    verbosity: 'standard',
    description: 'Full implementation. Rationale present. Audit findings only.',
  },
  {
    id: 'REVIEW', label: 'REVIEW', builtIn: true,
    sections: ['assumptions', 'rationale', 'audit', 'test'],
    verbosity: 'expanded',
    description: 'Audit-forward. Full findings. No code generation.',
  },
  {
    id: 'CAPTURE', label: 'CAPTURE', builtIn: true,
    sections: ['assumptions', 'building'],
    verbosity: 'dense',
    description: 'Minimal ceremony. Decisions recorded. Move fast.',
  },
]

export const BUILT_IN_MODE_IDS = BUILT_IN_MODES.map(m => m.id)

export function findMode(id: string, userModes: CustomMode[] = []): CustomMode | undefined {
  return [...BUILT_IN_MODES, ...userModes].find(m => m.id === id)
}
