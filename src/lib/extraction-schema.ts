// === EXTRACTION SCHEMA — GROUP 1 ===
// Zod 4 schema for DirectiveStatePatch — the only shape an extraction response
// may take. Unknown fields are tracked as droppedFields. Forbidden fields (LOCKED)
// cause YUGAMI-SCHEMA and block before Zod sees the object.

import { z } from 'zod'
import { BUILT_IN_MODE_IDS } from '@/data/modes'

// LOCKED_FIELDS — extraction patches may never write these.
// Attempts to do so fire KAPU or YUGAMI and block the patch.
export const LOCKED_FIELDS = [
  'escalationTriggers',
  'outputSections',
  'customAppend',
  'outputTarget',
  'integrityState',
  'firedTobiraIds',
  'sessionId',
  'userModes',
  'projectNarratives',
] as const

export const DirectiveStatePatchSchema = z.object({
  activeProjectIds: z.array(z.string()).optional(),
  sessionMode:      z.string().refine(v => BUILT_IN_MODE_IDS.includes(v), {
    message: `sessionMode must be one of ${BUILT_IN_MODE_IDS.join('|')}`,
  }).optional(),
  verbosity:        z.enum(['dense', 'standard', 'expanded']).optional(),
  themeId:          z.string().optional(),
  hygieneTrigger:   z.enum(['off', 'on-copy', 'turn-based', 'manual']).optional(),
  openQuestions:    z.array(z.object({
    projectId: z.string(),
    text:      z.string(),
  })).optional(),
})

export type DirectiveStatePatch = z.infer<typeof DirectiveStatePatchSchema>

export type ValidationResult = {
  valid: boolean
  patch: DirectiveStatePatch
  droppedFields: string[]
  forbiddenFields: string[]
  errors: string[]
}

// validatePatch — call on raw API response before applying to state.
// LOCKED_FIELDS check runs first. Zod validates the remaining fields.
// Unknown fields are tracked as droppedFields, not surfaced as errors.
export function validatePatch(raw: unknown): ValidationResult {
  const droppedFields: string[] = []
  const forbiddenFields: string[] = []
  const errors: string[] = []

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { valid: false, patch: {}, droppedFields, forbiddenFields, errors: ['Response is not a JSON object'] }
  }

  const obj = raw as Record<string, unknown>

  // LOCKED_FIELDS check before Zod — forbidden field = immediate block
  for (const key of Object.keys(obj)) {
    if ((LOCKED_FIELDS as readonly string[]).includes(key)) forbiddenFields.push(key)
  }
  if (forbiddenFields.length > 0) {
    return {
      valid: false, patch: {}, droppedFields, forbiddenFields,
      errors: [`Forbidden fields in extraction response: ${forbiddenFields.join(', ')}. YUGAMI-SCHEMA.`],
    }
  }

  // Zod parse — schema fields only
  const result = DirectiveStatePatchSchema.safeParse(raw)

  // Track dropped fields (keys in raw not in schema)
  const schemaKeys = new Set(Object.keys(DirectiveStatePatchSchema.shape))
  for (const key of Object.keys(obj)) {
    if (!schemaKeys.has(key)) droppedFields.push(key)
  }

  if (!result.success) {
    for (const issue of result.error.issues) errors.push(issue.message)
    return { valid: false, patch: {}, droppedFields, forbiddenFields, errors }
  }

  return { valid: true, patch: result.data, droppedFields, forbiddenFields, errors }
}
