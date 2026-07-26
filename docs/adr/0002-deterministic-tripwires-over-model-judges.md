# ADR 0002 — Deterministic tripwires instead of a model-based judge

Status: accepted · Date: 2026-05 (documented 2026-07)

## Context

Injection and drift detection could be delegated to a second LLM ("judge")
scoring inputs for adversarial intent. Judges catch novel phrasing that
regexes miss, and most contemporary guardrail products take that route.

## Decision

The TOBIRA registry is pure deterministic code: regexes and small predicate
functions, each with a fixed severity, audit code, and owning module. No
model is in the detection path. STELE ships as a single offline HTML file.

## Rationale

- **The judge inherits the vulnerability it guards.** A model scoring
  adversarial text is itself promptable by that text; the guard and the
  guarded share a failure mode. Deterministic rules cannot be argued with.
- **Auditability is the product.** Every block is attributable to a numbered
  rule with a stable audit code; a judge yields a score with no replayable
  explanation.
- **Offline is a feature.** Detection that requires an API call fails exactly
  when the network or provider is the thing under suspicion.

## Consequences

- Known blind spot: novel phrasing that matches no pattern. Accepted; the
  registry is designed for cheap extension (one entry + corpus cases), and
  TW-007/TW-013-style low-confidence heuristics provide a soft net.
- False-positive discipline lives in `tripwires.test.ts`: every rule carries
  attack strings that must fire and a shared benign corpus that must not.
- Registry entries are append-only in spirit: patching a rule ad-hoc without
  corpus changes is treated as a review smell (see registry header comment).
