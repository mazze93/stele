# UI alignment and replay boundary — release evidence

## Scope and decisions

The app had backend and compiler capabilities without usable controls: user modes
were read but never authored; the audit view displayed hashes without a check or
export action; STELE's project record still declared SHA-256 wiring, the single
file build and T-010 unresolved. This release connects those existing capabilities.

The session page derives its status and capability flags from the production
integrity table. It distinguishes local audit consistency from completeness and
approved-objective fidelity. It does not claim remote delivery, remote chain
verification, or live CI status. Modes remain operator-authored and session-only;
extraction cannot write them. The EPOCHÉ reset-only boundary is unchanged.

Design direction: an editorial inspection desk within Cipher Gothic. The serif
inscription establishes hierarchy; monospace metadata stays subordinate. The
current operational state and available actions precede detailed evidence.

Sources studied (principles only; no assets or code copied):

- [Charm's process](https://charm.land/blog/100k): make the next action discoverable
  and test both small and large windows; derive views from actual state.
- [GOV.UK details](https://design-system.service.gov.uk/components/details): disclose
  optional depth without hiding frequently needed actions. Verification and export
  remain visible; supporting boundaries can be expanded.
- [Generous archival interfaces](http://ica2012.ica.org/files/pdf/Full%20papers%20upload/ica12Final00423.pdf):
  overview before query and context beside primary evidence. Existing project
  typography and theme tokens are retained rather than introducing new assets.

## Original finding and repaired boundary

On c2adff7 the bs probe replaced only scope.mjs with `inScope = () => false`.
The candidate returned `{covered:[], counterexamples:[], holds:true}` and replay
returned ZANSHIN, although the witness gate was false. The original pinned
manifest detected modified file bytes; replay itself did not verify that identity.

Replay now requires a caller-pinned complete input snapshot. Authentication
precedes imports, verified bytes are materialized in a fresh private directory,
and scope witnesses are evaluated separately from candidate proof claims. The
input digest must come from an independently trusted caller/approved record;
a colocated digest is not an external approval anchor. Only synthetic fixtures
are supported; Node candidate imports are not an OS sandbox. The seventh fixture
preserves the original empty-scope counterexample. This is bounded regression
evidence, not formal proof or general autonomous-agent robustness.

## Verification and reproduction

Use Node 24 and the repository pnpm lockfile. Commands for the final candidate:

```sh
pnpm check
pnpm build
node --test evals/assurance-integrity/evidence.test.mjs evals/assurance-integrity/replay.test.mjs
node evals/assurance-integrity/run.mjs .closure/release-assurance
node site/check-story.mjs
```

`browser-smoke.cjs` uses Playwright and system Chromium, without adding a runtime
dependency to STELE. Run against `pnpm dev`, or set STELE_TEST_URL to a preview or
production URL. It checks desktop mode authoring, section/verbosity edits,
protected built-ins, deletion fallback, chain verification, JSON export, mobile
navigation and overflow, and uncaught browser exceptions. Screenshots default
to /tmp; screenshot destinations can be overridden with STELE_DESKTOP_SCREENSHOT
and STELE_MOBILE_SCREENSHOT. It uses synthetic session data and no model API key.

Initial browser attempt stopped because the test required the accessible name
`Levers` exactly while its button includes a decorative glyph. A suffix match
fixed the test; no product defect was inferred. The corrected run passed desktop,
390px mobile, mode authoring and audit export (one session-start entry), with no
page exceptions. Release execution results and deployment IDs are retained in
RELEASE.md rather than inferring deployment from successful compilation.
