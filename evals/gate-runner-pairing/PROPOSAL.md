# Gate-runner pairing objective: proposal

Status: **pending approval**. Nothing in this directory is an approved
objective yet, and no check may depend on `objective.proposed.json` until the
maintainer has signed the approval tag described below.

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

## How approval is recorded

#114's approval was transcribed into `objective.json` by the agent that wrote
the code, and its README says so: it is not evidence of human approval. This
brick closes that gap rather than repeating it.

Approval is an SSH-signed git tag that the maintainer makes on their own
machine, pointing at the commit that adds this proposal. No agent session
holds that key. The replay checker will accept the objective only if:

1. tag `pairing-objective-v1-approved` exists and points at the proposal
   commit;
2. its signature verifies with `git verify-tag`;
3. the signing key's fingerprint matches one of the public SSH signing keys
   GitHub lists for `mazze93`, fetched by the checker at run time rather than
   read from the checkout;
4. the SHA-256 of `objective.proposed.json` at that commit equals the
   `approvedProposalSha256` in the final `objective.json`.

GitHub's own "Verified" badge does not count: squash merges are signed by
GitHub's web-flow key whoever presses the button, including an agent holding
the maintainer's token.

### Maintainer steps (once the proposal reads right)

One-time, if commits are not already SSH-signed on this machine:

```sh
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
```

Add the same public key on GitHub as a **Signing key** (Settings, SSH and GPG
keys, New SSH key, key type Signing Key). Then, from the Stele checkout:

```sh
git fetch origin brick/pairing-objective
git tag -s pairing-objective-v1-approved <proposal-commit> \
  -m "Approve stele-gate-runner-pairing-v1 as proposed"
git verify-tag pairing-objective-v1-approved
git push origin pairing-objective-v1-approved
```

`<proposal-commit>` is the commit on `brick/pairing-objective` that adds this
file; the draft PR names it.

## What gets built after approval

Same structure as `evals/assurance-integrity/`, in a new
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
  bridge's rank map, and verifies the approval tag as above.
- A CI step in `gate-runner-pairing` that runs both.

## Limits

The checker still runs inside CI that a PR can edit, so on its own it is
regression evidence, not an enforced GitHub boundary; making it one needs a
required status check whose workflow lives outside the PR's reach (for example
a ruleset requiring a workflow from a protected branch). The signed tag
anchors who approved the objective; it does not anchor the verifier code.
