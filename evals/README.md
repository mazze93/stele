# evals

An adversarial regression harness for the detection layer. Two tiers, one rule
that governs both: **a model may sit in the call path; a model may never sit in
the grader.**

That rule is ADR-0002 applied to the harness itself. A judge is promptable by
the same content it is judging, and a similarity score is not a replayable
audit code. Every verdict here is a string comparison against a TOBIRA id, a
boolean from the real detector, or a key-set check.

## Deterministic tier — the CI gate

```bash
pnpm eval        # no network, no key, runs in CI
```

`evals/corpus.ts` holds labeled cases. Each declares the single TOBIRA it
exists to exercise and which surface it belongs to — `scanPasteInput()` runs
TW-001…TW-011, `scanExtractionResponse()` runs TW-012…TW-013, and the runner
refuses to grade a case on the wrong one.

Five things fail the build:

1. **Per-TOBIRA recall.** Every case must fire *its labeled id*. "Something
   fired" is not a pass — that is how a rule goes dark behind a neighbour that
   happens to match the same string.
2. **Zero benign false positives.** No threshold, no budget. A gate that cries
   wolf on ordinary paste trains the operator to click through the one that
   matters.
3. **Coverage as a gate.** Every entry in `TOBIRA_REGISTRY` needs ≥1 case,
   asserted rather than reviewed. Adding a tripwire without a case fails here.
4. **Registry floor.** The registry cannot silently shrink.
5. **Per-rule regression** against `evals/baseline.json`. Per rule, not
   aggregate — a growing corpus would otherwise hide one module rotting.

Plus the locked-field contract asserted directly against `validatePatch()`,
using the same assertions the live tier reuses on real model output.

### Baseline

`evals/baseline.json` is committed and is the thing regressions are measured
against.

```bash
UPDATE_EVAL_BASELINE=1 pnpm eval   # regenerate, then commit the change
```

Regenerate when you *add* coverage. Regenerating to make a red gate go green is
the failure mode this file exists to prevent — if recall dropped, the detector
changed, and that is the finding.

`evals/report.json` is written every run (misses, false positives, per-rule
recall, coverage gaps) and is not committed.

## Live tier — opt-in, real API calls

```bash
ANTHROPIC_API_KEY=... pnpm eval:live
```

Costs money. Never runs in CI. Skips itself cleanly without a key.

This measures the one thing fixtures cannot: whether content that **survives
the paste gate** can still steer the model into emitting structure it was told
never to emit. Every case in `evals/live/pipeline.eval.ts` is engineered to
pass `scanPasteInput()` untouched — if one starts firing a paste TOBIRA, that
is the gate improving, and the case needs replacing rather than the tier
failing.

The grading stays deterministic: locked fields absent from the applied patch,
`validatePatch()` rejecting whole rather than stripping-and-applying when the
model does emit one, and the response scanners returning well-formed verdicts
on real payloads.

## Deliberately not here

Quality evaluation of the philosopher-scribe narrative in `CollaboratorPanel`.
That is subjective rather than adversarial, and it needs a different harness
with its own result plumbing. A fuzzy judge must not share a report with an
auditable security gate — the moment they share one number, the number means
neither thing.

## Adding a case

```ts
{
  id: 'kapu/some-new-shape',
  surface: 'paste',
  expect: 'TW-001',        // the rule this case is FOR
  alsoFires: ['TW-004'],   // known collateral, documented not penalised
  input: '...',
  note: 'why this case is shaped this way',
}
```

Synthetic credentials only. The APOCRYPHA cases are shaped like credentials and
are not credentials; keep it that way.
