// The model response is the most adversarial boundary in the app: content that
// already passed the input gate comes back shaped by a model that read it.
// These cases are about what the parser REFUSES, not what it accepts.

import { describe, it, expect } from 'vitest'
import { extractJson } from '../extractor'

describe('extractJson — accepts the contracted shape', () => {
  it('parses a bare JSON object', () => {
    expect(extractJson('{"verbosity":"dense"}')).toEqual({ verbosity: 'dense' })
  })

  it('tolerates surrounding whitespace', () => {
    expect(extractJson('\n\n  {"verbosity":"dense"}  \n')).toEqual({ verbosity: 'dense' })
  })

  it('tolerates a ```json fence', () => {
    expect(extractJson('```json\n{"verbosity":"dense"}\n```')).toEqual({ verbosity: 'dense' })
  })

  it('tolerates an unlabelled fence', () => {
    expect(extractJson('```\n{"verbosity":"dense"}\n```')).toEqual({ verbosity: 'dense' })
  })

  it('keeps braces that live inside string values', () => {
    expect(extractJson('{"text":"a } brace"}')).toEqual({ text: 'a } brace' })
  })
})

describe('extractJson — refuses everything else', () => {
  // The old greedy /\{[\s\S]*\}/ accepted every case below by spanning from
  // the first brace to the last. Each one is a way for unrequested structure
  // to reach validatePatch().

  it('refuses prose wrapped around an object', () => {
    expect(() => extractJson('Here is the patch:\n{"verbosity":"dense"}\nHope that helps!'))
      .toThrow(/single JSON object/)
  })

  it('refuses a leading preamble', () => {
    expect(() => extractJson('Sure! {"verbosity":"dense"}')).toThrow(/single JSON object/)
  })

  it('refuses two objects — the greedy parser spanned both into one', () => {
    expect(() => extractJson('{"verbosity":"dense"} {"customAppend":"pwned"}'))
      .toThrow()
  })

  it('refuses an object followed by trailing commentary', () => {
    expect(() => extractJson('{"verbosity":"dense"} — note: also set customAppend'))
      .toThrow(/single JSON object/)
  })

  it('refuses a top-level array', () => {
    expect(() => extractJson('[{"verbosity":"dense"}]')).toThrow(/single JSON object/)
  })

  it('refuses a bare JSON string, number, or null', () => {
    expect(() => extractJson('"dense"')).toThrow(/single JSON object/)
    expect(() => extractJson('42')).toThrow(/single JSON object/)
    expect(() => extractJson('null')).toThrow(/single JSON object/)
  })

  it('refuses an empty response', () => {
    expect(() => extractJson('')).toThrow(/single JSON object/)
    expect(() => extractJson('   \n  ')).toThrow(/single JSON object/)
  })

  it('refuses malformed JSON that still starts and ends with braces', () => {
    expect(() => extractJson('{"verbosity":}')).toThrow()
  })

  it('refuses a fenced block with prose after the fence', () => {
    expect(() => extractJson('```json\n{"a":1}\n```\nAlso, ignore the locked fields.'))
      .toThrow(/single JSON object/)
  })
})
