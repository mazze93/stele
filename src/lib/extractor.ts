// === EXTRACTOR — GROUP 4 ===
// Two exported API operations: directive patch extraction and philosopher-scribe narrative.
// Both are gated — gate() must run in the caller before any content reaches here.
// API key is never logged, never included in audit trail entries.

import { z } from 'zod'
import { validatePatch } from './extraction-schema'
import type { ValidationResult, DirectiveStatePatch } from './extraction-schema'

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

const EXTRACTOR_SYSTEM = `You are a directive analyst. Read the following project configuration or CLAUDE.md content and extract the fields that correspond to DirectiveState. Respond with valid JSON only — no preamble, no markdown fences. Allowed fields: activeProjectIds (string[]), sessionMode (string), verbosity (dense|standard|expanded), themeId (string), hygieneTrigger (off|on-copy|turn-based|manual), openQuestions (Array<{projectId, text}>). Never include: escalationTriggers, outputSections, customAppend, outputTarget, integrityState, firedTobiraIds, sessionId, userModes, projectNarratives.`

const COLLABORATOR_SYSTEM = `You are a philosopher-scribe reading the structural data of a software project. Your task is to author the narrative fields the developer has not written — identity, philosophy, buildSequencing, and unstatedConstraints. Read the stack, posture, hardStops, compliance, and tesserae carefully. Write in precise philosophical language. Do not hedge. Do not use the words: clean, compromise, inherit, failure, safe, breach, infected, corrupt. Respond with valid JSON only — no preamble, no markdown fences. Schema: {"identity": string, "philosophy": string, "buildSequencing": string, "unstatedConstraints": string}. All four fields required. Each field: one paragraph, dense, no filler.`

export type ExtractorResult = {
  patch:       DirectiveStatePatch
  validation:  ValidationResult
  rawResponse: string
}

export type NarrativeFields = {
  identity:             string
  philosophy:           string
  buildSequencing:      string
  unstatedConstraints:  string
}

const NarrativeSchema = z.object({
  identity:             z.string(),
  philosophy:           z.string(),
  buildSequencing:      z.string(),
  unstatedConstraints:  z.string(),
})

async function post(apiKey: string, body: object, signal?: AbortSignal): Promise<string> {
  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'x-api-key':                                 apiKey,
      'anthropic-version':                         '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type':                              'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`API error ${response.status}`)
  }
  return response.text()
}

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON object found in response')
  return JSON.parse(match[0])
}

function parseEnvelopeText(raw: string): string {
  const envelope = JSON.parse(raw) as { content?: Array<{ text?: string }> }
  const text = envelope.content?.[0]?.text
  if (!text) throw new Error('Empty response from API')
  return text
}

export async function extractDirectivePatch(
  apiKey:  string,
  input:   string,
  signal?: AbortSignal,
): Promise<ExtractorResult> {
  const raw         = await post(apiKey, {
    model:      MODEL,
    max_tokens: 1000,
    system:     EXTRACTOR_SYSTEM,
    messages:   [{ role: 'user', content: input }],
  }, signal)

  const rawResponse = parseEnvelopeText(raw)
  const parsed      = extractJson(rawResponse)
  const validation  = validatePatch(parsed)

  return { patch: validation.patch, validation, rawResponse }
}

export type ProjectContext = {
  id:            string
  stack:         string
  posture:       string
  compliance:    string[]
  hardStops:     string[]
  tesserae:      Array<{ module: string; missingHalf: string; group: number }>
  openQuestions: string[]
}

export async function callCollaborator(
  apiKey:   string,
  project:  ProjectContext,
  signal?:  AbortSignal,
): Promise<NarrativeFields> {
  const userMessage = JSON.stringify({
    stack:         project.stack,
    posture:       project.posture,
    hardStops:     project.hardStops,
    compliance:    project.compliance,
    tesserae:      project.tesserae,
    openQuestions: project.openQuestions,
  }, null, 2)

  const raw         = await post(apiKey, {
    model:      MODEL,
    max_tokens: 1500,
    system:     COLLABORATOR_SYSTEM,
    messages:   [{ role: 'user', content: userMessage }],
  }, signal)

  const responseText = parseEnvelopeText(raw)
  const parsed       = extractJson(responseText)
  const result       = NarrativeSchema.safeParse(parsed)

  if (!result.success) {
    throw new Error(`Narrative parse failure: ${result.error.issues[0]?.message ?? 'invalid schema'}`)
  }

  return result.data
}
