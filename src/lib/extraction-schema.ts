// === EXTRACTION SCHEMA — GROUP 1 ===
// Zod schema for DirectiveStatePatch — the only shape an extraction response
// may take. Unknown fields are dropped. Forbidden fields cause YUGAMI-SCHEMA.
// LOCKED_FIELDS is the authoritative list of state fields an extraction patch
// is never allowed to write. This constant is imported by extractor.ts (Group 4).
//
// GROUP 2 WIRING TODO:
//   - Import validatePatch() from extractor.ts response handler
//   - On ValidationResult.valid === false, fire YUGAMI-SCHEMA TOBIRA
//   - On ValidationResult.droppedFields.length > 0, log to audit trail

// LOCKED_FIELDS — extraction patches may never write these
// Attempts to do so fire KAPU or YUGAMI and block the patch
export const LOCKED_FIELDS = [
  'escalationTriggers',    // governance layer — never extraction-writable
  'outputSections',        // output contract — user-configured only
  'customAppend',          // KAPU-003: hard stop
  'outputTarget',          // user intent — not inferable from source files
  'integrityState',        // integrity machine controls this
  'firedTobiraIds',        // integrity machine controls this
  'sessionId',             // generated at session start, immutable
] as const

// Allowed patch fields — the only things extraction may suggest
// Note: openQuestions is allowed but validated for structure
type DirectiveStatePatch = {
  activeProjectIds?: string[]
  sessionMode?: 'PLAN' | 'BUILD' | 'REVIEW' | 'CAPTURE'
  verbosity?: 'dense' | 'standard' | 'expanded'
  themeId?: string
  hygieneTrigger?: 'off' | 'on-copy' | 'turn-based' | 'manual'
  openQuestions?: Array<{ projectId: string; text: string }>
}

export type ValidationResult = {
  valid: boolean
  patch: DirectiveStatePatch
  droppedFields: string[]      // fields in response not in schema — dropped silently
  forbiddenFields: string[]    // LOCKED_FIELDS found — triggers YUGAMI + block
  errors: string[]
}

// validatePatch() — call on raw API response before applying to state
// Returns the cleaned patch and a full account of what was found
export function validatePatch(raw: unknown): ValidationResult {
  const droppedFields: string[] = []
  const forbiddenFields: string[] = []
  const errors: string[] = []
  const patch: DirectiveStatePatch = {}

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { valid: false, patch, droppedFields, forbiddenFields, errors: ['Response is not a JSON object'] }
  }

  const obj = raw as Record<string, unknown>

  // Check for forbidden (LOCKED) fields
  for (const key of Object.keys(obj)) {
    if ((LOCKED_FIELDS as readonly string[]).includes(key)) {
      forbiddenFields.push(key)
    }
  }

  if (forbiddenFields.length > 0) {
    return {
      valid: false, patch, droppedFields, forbiddenFields,
      errors: [`Forbidden fields in extraction response: ${forbiddenFields.join(', ')}. YUGAMI-SCHEMA.`],
    }
  }

  // Validate and extract allowed fields
  const VALID_MODES = ['PLAN','BUILD','REVIEW','CAPTURE']
  const VALID_VERBOSITY = ['dense','standard','expanded']
  const VALID_HYGIENE = ['off','on-copy','turn-based','manual']

  for (const [key, value] of Object.entries(obj)) {
    switch (key) {
      case 'activeProjectIds':
        if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
          patch.activeProjectIds = value
        } else { droppedFields.push(key); errors.push(`activeProjectIds: expected string[]`) }
        break
      case 'sessionMode':
        if (typeof value === 'string' && VALID_MODES.includes(value)) {
          patch.sessionMode = value as DirectiveStatePatch['sessionMode']
        } else { droppedFields.push(key); errors.push(`sessionMode: expected one of ${VALID_MODES.join('|')}`) }
        break
      case 'verbosity':
        if (typeof value === 'string' && VALID_VERBOSITY.includes(value)) {
          patch.verbosity = value as DirectiveStatePatch['verbosity']
        } else { droppedFields.push(key) }
        break
      case 'themeId':
        if (typeof value === 'string') patch.themeId = value
        else droppedFields.push(key)
        break
      case 'hygieneTrigger':
        if (typeof value === 'string' && VALID_HYGIENE.includes(value)) {
          patch.hygieneTrigger = value as DirectiveStatePatch['hygieneTrigger']
        } else droppedFields.push(key)
        break
      case 'openQuestions':
        if (Array.isArray(value)) {
          const valid = value.filter(q =>
            typeof q === 'object' && q !== null &&
            typeof (q as Record<string,unknown>).projectId === 'string' &&
            typeof (q as Record<string,unknown>).text === 'string'
          ) as Array<{projectId: string; text: string}>
          patch.openQuestions = valid
          if (valid.length < value.length) droppedFields.push(`${key}[malformed entries]`)
        } else droppedFields.push(key)
        break
      default:
        droppedFields.push(key)
    }
  }

  return { valid: forbiddenFields.length === 0, patch, droppedFields, forbiddenFields, errors }
}
