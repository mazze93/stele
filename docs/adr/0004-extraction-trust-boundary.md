# ADR 0004 — The extraction trust boundary

Status: **proposed — scoped, not built** · Date: 2026-08-04

## Context

`extractor.ts` posts to `api.anthropic.com` directly from the browser, with the
operator's key in `x-api-key` and `anthropic-dangerous-direct-browser-access:
'true'` (lines 45–47). The model credential lives in the least trusted tier of
a system whose entire thesis is that the harness, not the model, is the
security boundary.

That is the sharpest contradiction in the repo, and it is not theoretical:
browser extensions, devtools, a shared machine, or any XSS in a single-file
bundle all reach a key held there. STELE tells operators to treat pasted
content as hostile while handing the credential to the tier that renders it.

Two facts constrain the fix:

- **`bundle.html` is the product.** A single offline file dropped into a
  session is the delivery model, and ADR-0002 already leans on offline
  operation as a security property. Any relay makes extraction — and only
  extraction — network- and server-dependent.
- **`stele-core` is not deployed.** It exists, is now authenticated (bearer on
  `/api/*`, loopback bind), and owns the durable audit chain. But it runs on
  localhost, so it cannot serve the hosted app at `stele.mazzeleczzare.com`.

## Decision

**Scope the boundary; do not implement it yet.** Browser-direct extraction
stays in place for now, and the README must say so plainly rather than let the
harness framing imply otherwise.

When it is built, the relay is a **first-party STELE surface**, not a borrowed
one. The two candidates were:

- **`stele-core`** — already STELE's trusted tier, already authenticated, keeps
  the extractor system prompt and Zod schema in this repo, no cross-repo
  coupling. Costs: local-only today, so the hosted app gains nothing until it
  is deployed.
- **`tools/adaptive-response`** — already at the edge, so the hosted app
  benefits immediately. Costs: it is a HIGH-posture repo with its own contract
  (`POST /v1/respond` returning `AdaptiveResponse` — confidence scores,
  clarifying-question routing, risk metadata). STELE needs a
  `DirectiveStatePatch`, not that shape. Serving STELE would mean widening a
  schema-driven service into a general relay, which erodes the property that
  makes it worth reusing.

Neither is chosen here. The decision that *is* made: the relay must not become
a generic pass-through in someone else's repo, and whichever tier holds the key
must also hold the extractor system prompt and the response scan — splitting
them puts the prompt on one side of the boundary and its enforcement on the
other.

## Constraints any implementation inherits

1. **The gate stays client-side.** `gate()` runs before content leaves the
   browser. A relay that gates server-side only would ship un-scanned paste
   content off-machine, which is strictly worse than today.
2. **The response scan stays wherever the response first lands.** T-006's
   YUGAMI/TESSITURA pass currently runs in `extractor.ts` before the caller
   sees anything; a relay must run it before returning, not delegate it back.
3. **`LOCKED_FIELDS` enforcement stays client-side regardless.** The browser
   applies the patch, so the browser validates it. Server-side validation is
   additional, never a replacement.
4. **No credential ever reaches the audit trail**, in either tier. ADR-0003
   holds unchanged: boolean only.
5. **EPOCHÉ must survive relay failure.** A relay that is down produces WABI —
   honest diminishment, extraction suspended — not a silent fallback to
   browser-direct.

## Consequences

- Until this is built, the README's harness claims carry an asterisk, and the
  blog post describing STELE's architecture must not present the trust boundary
  as closed.
- `stele-core` being undeployed is now on the critical path for the relay, not
  just for durable audit. That raises the value of deploying it and is the
  strongest argument for the `stele-core` option.
- Choosing `stele-core` and deploying it converges with ADR-0005: the same tier
  that holds the key is the one that would emit the policy envelope.
