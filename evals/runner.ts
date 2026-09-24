// === EVAL RUNNER ===
// Grading is deterministic. Every verdict here is a string comparison against
// a TOBIRA id or a boolean from the real detector — never a similarity score,
// never a model's opinion of whether something "looks compromised."
//
// ADR-0002 rejected model judges for detection. The same reasoning applies to
// grading detection: a judge is promptable by the content under test, and a
// score is not a replayable audit code. A model may sit in the CALL PATH
// (see evals/live/) — it may never sit in the grader.

import { scanPasteInput, scanExtractionResponse, TOBIRA_REGISTRY } from '@/lib/tripwires'
import type { CorpusCase, Surface } from './corpus'

export function scanFor(surface: Surface, input: string): string[] {
  const result = surface === 'paste' ? scanPasteInput(input) : scanExtractionResponse(input)
  return result.fired.map(t => t.id)
}

export type CaseResult = {
  caseId: string
  expect: string
  fired: string[]
  /** The labeled TOBIRA fired. This is what recall counts. */
  hit: boolean
  /** Fired IDs beyond the labeled one — visible, not penalised. */
  collateral: string[]
}

export function runAdversarial(cases: CorpusCase[]): CaseResult[] {
  return cases.map(c => {
    const fired = scanFor(c.surface, c.input)
    return {
      caseId: c.id,
      expect: c.expect,
      fired,
      hit: fired.includes(c.expect),
      collateral: fired.filter(id => id !== c.expect),
    }
  })
}

export type BenignResult = { caseId: string; fired: string[] }

export function runBenign(cases: CorpusCase[]): BenignResult[] {
  return cases.map(c => ({ caseId: c.id, fired: scanFor(c.surface, c.input) }))
}

// --- Per-TOBIRA recall ----------------------------------------------------
// Recall is reported per rule, not as one headline number. An aggregate hides
// exactly the failure that matters: one module going dark while the others
// carry the average.

export type RuleRecall = {
  tobiraId: string
  name: string
  cases: number
  hits: number
  /** null when the rule has no corpus case — a coverage gap, not 0% recall. */
  recall: number | null
}

export function perRuleRecall(cases: CorpusCase[], results: CaseResult[]): RuleRecall[] {
  return TOBIRA_REGISTRY.map(t => {
    const idx = cases
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.expect === t.id)
    const hits = idx.filter(({ i }) => results[i].hit).length
    return {
      tobiraId: t.id,
      name: t.name,
      cases: idx.length,
      hits,
      recall: idx.length === 0 ? null : hits / idx.length,
    }
  })
}

/** TOBIRA ids with no corpus case at all. Empty is the only passing value. */
export function coverageGaps(cases: CorpusCase[]): string[] {
  const covered = new Set(cases.map(c => c.expect))
  return TOBIRA_REGISTRY.filter(t => !covered.has(t.id)).map(t => t.id)
}

// --- Report ---------------------------------------------------------------

export type EvalReport = {
  adversarialCases: number
  benignCases: number
  /** Cases whose labeled TOBIRA did not fire. */
  misses: string[]
  /** Benign inputs that fired anything. Must be empty. */
  falsePositives: Array<{ caseId: string; fired: string[] }>
  perRule: RuleRecall[]
  coverageGaps: string[]
}

export function buildReport(adversarial: CorpusCase[], benign: CorpusCase[]): EvalReport {
  const results = runAdversarial(adversarial)
  const benignResults = runBenign(benign)

  return {
    adversarialCases: adversarial.length,
    benignCases: benign.length,
    misses: results.filter(r => !r.hit).map(r => `${r.caseId} (expected ${r.expect})`),
    falsePositives: benignResults.filter(r => r.fired.length > 0),
    perRule: perRuleRecall(adversarial, results),
    coverageGaps: coverageGaps(adversarial),
  }
}

// --- Baseline comparison --------------------------------------------------
// The gate is "no rule got worse," not "the total went up." A corpus that
// grows while one rule silently rots would pass an aggregate check.

export type Baseline = { perRule: Array<{ tobiraId: string; recall: number | null }> }

export type Regression = {
  tobiraId: string
  was: number | null
  now: number | null
}

export function regressions(report: EvalReport, baseline: Baseline): Regression[] {
  const out: Regression[] = []
  for (const rule of report.perRule) {
    const prior = baseline.perRule.find(b => b.tobiraId === rule.tobiraId)
    if (!prior) continue
    // A rule that had coverage and now has none is a regression too — the case
    // was deleted rather than the detector broken, but the gate is just as gone.
    const wasCovered = prior.recall !== null
    const nowCovered = rule.recall !== null
    if (wasCovered && !nowCovered) {
      out.push({ tobiraId: rule.tobiraId, was: prior.recall, now: null })
    } else if (wasCovered && nowCovered && rule.recall! < prior.recall!) {
      out.push({ tobiraId: rule.tobiraId, was: prior.recall, now: rule.recall })
    }
  }
  return out
}
