# ADR 0005 — STELE's position in the ecosystem, and where a CLI comes from

Status: **proposed — direction, not a build order** · Date: 2026-08-04

## Context

STELE is currently a single-file browser artifact with a local persistence
service beside it. The question raised is how it fits with other dev tools and
the wider ecosystem — specifically whether it should grow a CLI entrypoint that
announces itself to Claude Code:

```ts
if (process.env.CLAUDECODE) {
  process.stderr.write(
    '<claude-code-hint v="1" type="plugin" value="stele@claude-plugins-official" />\n'
  )
}
```

That snippet presumes three things that do not exist: a `cli/` entrypoint, a
package identity published somewhere, and a plugin called
`stele@claude-plugins-official`.

The blog post already names the right frame for this, and it is not "STELE
should also be a CLI." It is:

> You can imagine STELE as the inner harness that a gateway calls as a **policy
> decision point** — "this session thinks it's in UTSUROI; here are the fired
> TOBIRA IDs; what are you prepared to allow?" … it can expose its evaluation
> context as a JSON envelope to an external policy service, letting a
> policy-as-code layer make decisions while STELE retains the stateful
> integrity record.

(The post says UTSUROI where it means a degraded *state*; the states are
ZANSHIN / UNHEIMLICH / WABI / EPOCHÉ, and UTSUROI is the audit term for a
transition. Corrected here so the framing does not inherit the error.)

## Decision

**STELE's ecosystem surface is an envelope, not a command.** What other tools
need from STELE is the answer to one question — *what does this session's
integrity record permit right now?* — in a form a policy engine can consume.
That is data, and it does not require a CLI to exist.

**A CLI is inherited, not authored.** STELE gains a command-line surface when
it is integrated with `cognitive/stratum` and `tools/adaptive-response`, because
those integrations are what make one useful:

- **stratum** (`cognitive/stratum`, MAX — "epistemic decision ledger →
  deterministic Tessera projection") already speaks STELE's vocabulary. STELE
  has a `Tessera` type (`types.ts:20`) and `stele-core` has a `Tessera` model.
  A ledger that projects Tesserae and a harness that records them are the same
  shape from two directions; the unification is where a shared command surface
  earns its keep.
- **adaptive-response** would, under ADR-0004, be one candidate home for the
  model-facing tier. A CLI that compiles an egregore without a browser needs
  exactly that tier to exist first.

So the ordering is: **envelope → stratum/adaptive-response integration → CLI →
plugin identity**, and the `claude-code-hint` line is the *last* step, not the
first. It announces a plugin; there must be a plugin to announce.

## Rationale

- **A stub CLI whose only job is to print a hint is a maintained surface for no
  current benefit** — a package entrypoint, a bin, a publishing decision, and a
  second way to invoke a tool whose deliverable is a self-contained HTML file.
- **The envelope is useful immediately and independently.** `stele-core`
  already holds the durable chain and now has an authenticated perimeter; a
  `GET /api/sessions/:id/envelope` returning integrity state, fired TOBIRA ids,
  capability flags from `INTEGRITY_STATES`, and the chain-verification result
  is a small addition to a tier that already exists.
- **It preserves the thing that makes STELE worth integrating.** STELE is
  opinionated about stopping. A gateway that consumes the envelope gets to
  honour EPOCHÉ; a gateway handed a generic CLI gets a text blob.

## Sketch — the envelope

Not built. Recorded so the shape is not re-derived:

```jsonc
{
  "sessionId": "...",
  "integrityState": "WABI",
  "firedTobiraIds": ["TW-005", "TW-008"],
  "capabilities": {           // straight from INTEGRITY_STATES, not re-encoded
    "allowsExtraction": false,
    "allowsApiCalls": false,
    "allowsStateWrites": true,
    "allowsPatchApplication": false
  },
  "chain": { "valid": true, "entries": 14 },   // GET /api/sessions/:id/verify
  "steleVersion": "1.x.x"
}
```

The consumer decides policy. STELE reports condition and never asks to be
overruled — there is no field here for "requested override," by design.

## Consequences

- The `claude-code-hint` snippet is deferred, not dropped, and is now
  sequenced behind work that has to happen anyway.
- `stele-core` accrues a third reason to be deployed: durable audit, the
  ADR-0004 relay, and now the envelope. Three consumers for one deployment is a
  much easier decision than one.
- If stratum unification lands first, revisit this ADR before building the
  envelope separately — stratum may be the better home for the projection, with
  STELE feeding it rather than serving it.
