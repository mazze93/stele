// === THE GATE ===
// Runs in CI with no network. Five assertions, each one a thing that has to
// stay true rather than a number that has to look good.

import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { TOBIRA_REGISTRY } from '@/lib/tripwires'
import { LOCKED_FIELDS } from '@/lib/extraction-schema'
import { validatePatch } from '@/lib/extraction-schema'
import { ADVERSARIAL, BENIGN } from './corpus'
import { buildReport, regressions, type Baseline } from './runner'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASELINE_PATH = join(HERE, 'baseline.json')
const REPORT_PATH = join(HERE, 'report.json')

const report = buildReport(ADVERSARIAL, BENIGN)

describe('eval gate', () => {
  // 1. Per-TOBIRA recall — the labeled rule must fire, not merely something.
  it('every adversarial case fires its labeled TOBIRA', () => {
    expect(report.misses).toEqual([])
  })

  // 2. Zero tolerance on benign. No threshold, no budget.
  it('no benign input fires anything', () => {
    expect(report.falsePositives).toEqual([])
  })

  // 3. Coverage as a gate, not a convention. A new TOBIRA without a corpus
  //    case fails here rather than being noticed in review, or not.
  it('every TOBIRA in the registry has at least one corpus case', () => {
    expect(report.coverageGaps).toEqual([])
  })

  it('the registry has not shrunk without the corpus noticing', () => {
    expect(TOBIRA_REGISTRY.length).toBeGreaterThanOrEqual(13)
  })

  // 4. Regression against the committed baseline. Per rule — an aggregate
  //    would let one module rot behind a growing corpus.
  it('no rule has lower recall than the committed baseline', () => {
    if (!existsSync(BASELINE_PATH)) {
      throw new Error(
        'evals/baseline.json is missing. Generate it with UPDATE_EVAL_BASELINE=1 pnpm eval and commit it.'
      )
    }
    const baseline: Baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
    expect(regressions(report, baseline)).toEqual([])
  })
})

// 5. The locked-field contract, asserted against validatePatch directly.
//    This is the assertion the live tier reuses on real model output — the
//    grading is identical whether the JSON came from a fixture or from Claude.
describe('locked fields are unwritable by extraction', () => {
  for (const field of LOCKED_FIELDS) {
    it(`rejects a patch touching ${field}`, () => {
      const result = validatePatch({ [field]: 'x' })
      expect(result.valid).toBe(false)
      expect(result.forbiddenFields).toContain(field)
      expect(result.patch).toEqual({})
    })
  }

  it('a patch mixing a legal field with a locked one is rejected whole', () => {
    const result = validatePatch({ verbosity: 'dense', customAppend: 'injected' })
    expect(result.valid).toBe(false)
    expect(result.patch).toEqual({})
  })
})

// Report is a side effect, never an assertion. Written after the gate so a
// failing run still leaves the evidence on disk.
describe('report', () => {
  it('writes evals/report.json', () => {
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n')

    if (process.env.UPDATE_EVAL_BASELINE === '1') {
      const baseline: Baseline = {
        perRule: report.perRule.map(r => ({ tobiraId: r.tobiraId, recall: r.recall })),
      }
      writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n')
    }

    expect(existsSync(REPORT_PATH)).toBe(true)
  })
})
