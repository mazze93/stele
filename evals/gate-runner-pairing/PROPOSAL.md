# Gate-runner pairing objective: proposal

Status: **pending approval**. Nothing in this directory is an approved
objective yet, and no check may depend on `objective.proposed.json` until the
approval has been recorded and checked under the contract described below.

This applies the method of `evals/assurance-integrity/` (#114) to the
three-repo pairing that CI runs as `gate-runner-pairing` (repinned in #116):
an immutable objective, adversarial candidates, gates that run independently,
and a replay checker that never trusts the candidate's own configuration.

## Why the current check is not enough

`evals/pairing.py` passes when Apatea reports no violations. Apatea skips the
monotonicity check for any atom the gate scores zero at baseline, because a
zero cannot be lowered. That is correct for Apatea, but it means the pairing
check never asks whether the gate detects the atoms at all.

`vacuity-probe.py` reproduces the gap with the pinned Apatea runner and the
exact atoms and transformations `pairing.py` uses. A gate that flags only the
positive control phrase, and none of the other four atoms, is reported clean:

| Gate | Clean | Monotonicity checks held |
| --- | --- | --- |
| STELE production gate (today, main `cd930d3`) | yes | 190 |
| Weakened gate, one atom detected | yes | 38 |
| Production gate, bridge scores WABI and UNHEIMLICH as zero | yes | 114 |

```sh
python3 -I evals/gate-runner-pairing/vacuity-probe.py .closure/apatea
```

The third row is a transitive weakening: `security.ts` is untouched, but the
rank map in `apatea-bridge.mjs` scores WABI and UNHEIMLICH as zero, so the
"pre-authorized" and "disable the filter" atoms drop out of the monotonicity
check. (Collapsing EPOCHÉ too would fail, because the positive control is
EPOCHÉ.) I ran it against a throwaway copy of the bridge; it exits 0.

Two more weakenings follow from the same structure, each by editing a file the
PR itself controls:

- **Perimeter shrink:** drop atoms or transformations from `pairing.py`. Any
  subset of a clean run is clean.
- **Pin drift:** `pairing.py` checks the Apatea revision but never the
  Aletheia one; CI checks Aletheia out at the pin, but nothing in the report
  records which revision ran.

## Proposed objective

Under the pinned Apatea runner, STELE's production gate detects each of the
five fixed atoms at baseline, and no case, invisible-character or
Unicode-adjacency variant of any atom lowers its score or changes its extent.

`objective.proposed.json` is the exact text to approve. In short:

- **Pins:** Aletheia `8610069`, Apatea `160e7ad` (the #116 pins).
- **Perimeter:** the five atoms and three transformations `pairing.py` uses
  today, with the exact counts they produce (5 atoms, 190 variants, 390 checks;
  held 5 / 195 / 190).
- **Witnesses:** every atom must score above zero at baseline, judged by the
  replay checker against the gate directly.
- **Controls:** the same positive and benign controls `pairing.py` declares.
- **Composition:** Apatea against the pinned Aletheia gate stays clean, and
  the only seed atoms Aletheia scores zero are the two `port` JSON fragments it
  scores zero today (both come from the malicious corpus's config examples, not
  from injection text).
- **Change rule:** moving a pin or touching the perimeter, witnesses, controls
  or composition is a new objective version and needs a new approval.
- **Scope:** bounded lexical policy over this perimeter only. No claim of
  universal prompt-injection closure, paraphrase resistance, UI reachability,
  or transformations outside the three listed.

## Existing integration and authority contracts

STELE's [ADR-0005](../../docs/adr/0005-ecosystem-position.md) records the
integration direction and sequence through the integrity envelope, Stratum and
adaptive-response, then a shared CLI and plugin identity. ADR-0004 identifies
adaptive-response as a candidate home for the model-facing tier. The pairing
objective supplies bounded evidence about the gate and runner within that
architecture. Its implementation must preserve the consumer's policy role and
STELE's integrity-state capability semantics.

The governing Stratum records are maintained in
[mazze93/stratum](https://github.com/mazze93/stratum).

- `data/stele-trace.jsonl`, `st-000`, records the mandate that all STELE
  decisions route through Stratum.
- `docs/MEMORY_MODEL.md` defines authority tiers and status projection.
- `docs/ADR-003-trust-primitives.md`, sections 3–5 and 7, defines bound
  evidence, the authority-registry design, namespace-bound SSHSIG and
  version-preserving projection. `data/trust-trace.jsonl` preserves the
  decisions and their projected status.
- `docs/API.md` and `cli/lib/ingress.mjs` define the automated ingress path,
  reproducible evidence capture and interactive ratification gesture.

ADR-003's authority registry is recorded as unfinished R4 in Stratum's tracks
map. Its design and the deployed ingress behavior must each be checked at
implementation time. A proposal document cannot establish that either has
been implemented merely by citing it.

## Incident evidence informing the approval boundary

The tor-reference research archive records the September 17, 2026 incident in
`03-maestro/case-study-13-oauth-grant-reclamation.md` and
`04-incident/TESTAMENT.md`. Its captured projection,
`archive/stratum-tessera-2026-09-21.txt`, identifies the deliberately
agent-ratified entry `dec-mu5mtytb-251a` in log `tor-reference`.
These are first-party, agent-produced incident records with the evidence
limitations stated in the case study.

The records describe the same agent credential permitting ledger authorship
and ratification, and machine-accessible Git keys producing valid signatures
on agent-authored commits. The relevant acceptance condition therefore needs
to establish the authority of the approving act. A ledger event identifier,
projected axiomatic tier or valid machine signature alone cannot establish
human approval. Replay must check the actual enforcement available under the
applicable contract and report any remaining shared-credential assumption.
An interactive CLI gesture must be described with its implemented perimeter.

The testament also records the blue-marked Jujutsu head as intentionally
stranded. Its preserved disposition is part of the incident evidence. This
proposal references that record without requiring its merge or recovery.

## How approval is recorded

The objective remains pending. Its approval must be linked to a specific
Stratum decision and the authority contract in force for that event. The
implementation must retain the event identifier, ledger identity, contract
version, proposal commit and exact proposal-file SHA-256. It must derive the
applicable status and authority tier from the record and preserve the
separation between ratification and checked execution evidence.

The earlier standalone Git-tag ceremony is withdrawn from this proposal.
GitHub account signing-key lookup and a Git signature alone cannot establish
the authority conditions specified by Stratum. Any Git tag retained as a
content locator must be bound to the same proposal commit and digest, with
its role stated in the approval record.

Before enabling enforcement, the implementation must specify and test the
accepted Stratum authority state using the existing contract. If that path
depends on unfinished R4 work, record the dependency explicitly and keep the
objective pending. Changes to that contract belong in Stratum's decision
process.

Replay must retrieve the proposal bytes at the recorded commit, verify their
digest and compare every governing field of the executable objective with
that proposal. Copying an approved digest into a different objective is
insufficient. Pins, atoms, transformations, counts, witnesses, controls,
composition and scope all participate in that comparison. Approval-record
metadata must have an explicit schema so it cannot override those fields.

## What gets built after approval

Extend the structure of `evals/assurance-integrity/` within
`evals/gate-runner-pairing/`:

- `run.mjs`: drives six cases against the real gate and records evidence with
  the existing `evidence.mjs` writer (exclusive writes, SHA-256 manifest).
  - Adversaries, each expected KIRI: vacuous gate, perimeter shrink, bridge
    rank weakening, Aletheia pin drift.
  - Controls, each expected ZANSHIN: unchanged pairing, comment-only edit.
- Gates that each run even when another rejects: pin identity (both repos),
  perimeter identity and counts, baseline witnesses, Apatea invariants, and
  Aletheia composition.
- `replay.mjs`: a separate implementation, fresh process, fresh copy. It reads
  the approved objective and the gate, never `pairing.py`'s atom list or the
  bridge's rank map, and verifies the Stratum approval binding described above.
- A CI step in `gate-runner-pairing` that runs both.
- Evidence capture through Stratum's existing ingress, binding the observed
  run to the repository commit and deterministic inputs and outputs. Evidence
  records must identify both gate and runner revisions.
- Negative checks for altered objective fields with an unchanged approval
  digest, missing approval records and authority states outside the explicitly
  accepted contract. Establish a passing baseline on main before requiring the
  check through GitHub protection.

## Limits

The checker still runs inside CI that a PR can edit, so on its own it is
regression evidence, not an enforced GitHub boundary; making it one needs a
required status check whose workflow lives outside the PR's reach (for example
a ruleset requiring a workflow from a protected branch). The approval binding
must identify the objective bytes and authority record.
Verifier-code provenance remains a separate enforcement dependency.
