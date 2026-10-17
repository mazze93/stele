---
title: "STELE: Bounded Class Closure at the Content-to-Directive Boundary"
author: "Mazze LeCzzare"
date: "2026-10-16"
status: "Research draft; engineering case study, not peer reviewed"
version: "1.2.0"
keywords: [prompt-injection, threat-modeling, Unicode, verification-adequacy, audit-integrity]
---

# STELE: Bounded Class Closure at the Content-to-Directive Boundary

**Mazze LeCzzare** · Research draft · October 16, 2026

## Abstract

Directive compilers occupy an unusually sensitive boundary: they transform
project descriptions into text intended to govern an AI session. A malicious
project description can therefore attack the process that decides what counts
as instruction. STELE makes this boundary explicit through deterministic input
tripwires, constrained extraction, operator confirmation, monotonic integrity
states, and hash-chained event telemetry. This paper describes its threat model
and an engineering evaluation of bounded class closure. The central example is
a Unicode representation mismatch: an inserted format character can suppress a
literal matcher without reliably preventing a reader from recognizing the
surrounding phrase. STELE evaluates both original text and a declared
compatibility fold, retaining the union of detections because normalization can
also erase JSON structure. We evaluate the composition with Aletheia, a separate
provenance-sensitive gate, and Apatea, an out-of-band invariant-search runner.
The evaluation also tests whether the verifier can reject vacuous evidence.
Constant assessors, malformed answers, and empty searches show why monotonicity
alone cannot establish useful detection. A further integration finding shows
that a valid durable hash chain can omit events when the browser forwards only
the last entry of a multi-entry decision. We provide reproducible revision pins,
regression controls, and explicit residual threats. These results support a
bounded assurance contract; they do not demonstrate general prompt-injection
prevention or establish how a language model interprets arbitrary Unicode.

## 1. Problem and research questions

Indirect prompt injection places attacker-controlled instructions in material
an application retrieves or processes as data. Greshake et al. describe this
attack against LLM-integrated applications [1]. Research on instruction
hierarchy addresses the related problem of prioritizing privileged instructions
over lower-trust content [2]. STELE examines a narrower system boundary: the
point where project material is selected, extracted, and compiled into an
**egregore**, the directive document an operator supplies to a downstream AI
session. An egregore is text; its existence does not grant STELE control over
the downstream model or its tools.

We ask three questions. RQ1: what transformations of input representation can
be covered by a declared lexical policy and checked at its enforcement boundary?
RQ2: what evidence distinguishes useful adversarial search from a verifier that
passes vacuously? RQ3: does the composed browser-to-ledger system preserve the
events that local enforcement produces? These questions are separate: a detector
can recognize a pattern while enforcement remains disconnected, and a ledger
can verify a sequence that never contained every event it should have received.

The contribution is an inspectable engineering case study and release protocol,
not a new model-training method. The repair process was adaptive: the authors
inspected findings and changed the instrumentation. It was not preregistered,
and no statistical claim about attack prevalence or deployment-wide recall is
made.

## 2. System and data flow

STELE is a React/TypeScript browser application distributed as a single HTML
bundle and as a hosted application. Its deterministic TOBIRA registry scans
paste input before an extraction request. Extraction, when enabled, sends the
original permitted material to an external model using the operator's
browser-held API key. The response is scanned on a distinct surface, parsed,
and validated against a constrained patch schema. The operator selects fields
before application. Locked fields, including `customAppend`, cannot be authored
by extraction. Project narratives follow a separate authoring workflow and are
session-only unless manually preserved by the operator.

```text
project material -> raw-length admission -> raw + folded TOBIRA scan
  -> integrity decision -> local event queue -> local hash chain
  -> permitted extraction -> response scan -> patch schema -> field confirmation
  -> compiled egregore -> downstream AI session (outside STELE enforcement)

local event queue -> per-session ordered durable mirror
  -> TLS + bearer session capability -> Hono Worker -> Hyperdrive -> PostgreSQL
  -> independent replay of the stored server-side hash chain

Aletheia gate <---- pinned assessment adapter ---- Apatea adversarial runner
STELE gate   <---- JSONL production adapter ----- Apatea adversarial runner
```

Aletheia and Apatea are related instruments, not additional browser request
interceptors. Aletheia evaluates content provenance and governing parameters;
its Python implementation also has policy and hook behavior. The TypeScript
port's assessed projection is compared separately. Apatea runs out of band and
searches for violations of stated invariants. The release pins both repositories
in `evals/pairing-lock.json`; this is consumer composition evidence rather than
an assumption that every checkout on a machine contains current upstream code.

`stele-core` is a separate Hono service using Prisma/PostgreSQL, deployed as a
Cloudflare Worker with Hyperdrive. It creates session-scoped bearer capabilities,
stores token hashes, computes its own event-chain hashes, and provides replay.
Its administrator credential is distinct from the browser's model credential
and the per-session capability. The browser never needs the administrator
credential. Session creation is intentionally unauthenticated; aggregate routes
require administrator authentication.

## 3. Threat model

### 3.1 Assets and security objectives

The assets are operator-authored governance, integrity-state transitions,
credential confidentiality, the sequence of recorded security events, and the
provenance of parameters about to govern an action. The objectives are to keep
external content within its declared trust boundary, prevent automated writes
to locked governance, prevent recognized high-severity signals from continuing
through extraction, and make evidence sufficiently complete and reproducible
for an operator to assess a claim.

These objectives are deliberately narrower than truthfulness of generated text.
A schema-valid project description can still contain misleading prose. A model
can return a semantically adversarial allowed string. Operator confirmation is
an explicit decision point, but its effectiveness is not measured here.

### 3.2 Adversary capabilities

The paste adversary controls arbitrary input up to the raw admission limit.
They may insert Unicode format characters, compatibility forms, role markers,
authority claims, encoded material, misleading project metadata, and JSON keys
that resemble protected fields. They may attempt to exploit differences
between original and normalized representations. Model-derived responses are
also treated as untrusted: the model is not a trusted schema authority.

A network client may create its own core session, submit malformed API bodies,
possess the token for that session, and race concurrent appends. The evaluation
requires that one session token not authorize another session and that a client
not choose the ledger's chain hash. TLS protects transport; credential-bearing
smoke requests do not follow redirects. The operator, shipped code, deployment
credentials, and database administrator remain inside the trusted computing
base. A compromised browser extension, origin script, build pipeline, or
operator account can exceed the intended boundary.

An adversary with database write authority can rewrite an entire unanchored
chain and recompute its hashes. SHA-256 chaining detects modifications relative
to an intact predecessor history; it is not an external signature, an
append-only storage guarantee, or proof that the writer told the truth.

### 3.3 Trust boundaries and excluded guarantees

| Boundary | Mechanism | Explicit limit |
| --- | --- | --- |
| Paste to extraction | Raw admission and deterministic TOBIRA scan | Lexical coverage is finite; confidential text need not resemble a credential |
| Model output to state | Response scan, patch schema, locked fields, field confirmation | Allowed prose can still be misleading |
| Signal to behavior | Monotonic state decision before asynchronous audit work | Downstream model compliance is outside the application |
| Local to durable evidence | Per-session ordered mirror | Offline transport is best effort; a local chain is not delivery confirmation |
| Browser to core | Scoped bearer token, constant-time comparisons, CORS | CORS is not authentication; token theft permits its session's actions |
| Stored events to replay | Server-owned hash, explicit sequence order | No independent external anchor or writer-authenticity guarantee |
| Gate to runner | Revision pins, target controls, bounded transformations | A generated search is only as valid as its eligibility policy |

Credentials detected in paste are represented by a boolean APOCRYPHA indicator.
Detected credential bytes are not written to the event trail. The trail stores
event metadata, not the original pasted input or a digest of that input. This
corrects an overly broad statement in earlier fold documentation: retaining the
original for scanning and transmission does not imply that it is attested by
the event chain.

## 4. Integrity semantics and intentional suspension

STELE defines four ordered integrity states: ZANSHIN, UNHEIMLICH, WABI, and
EPOCHÉ. Escalation is monotonic within a session. UNHEIMLICH records a signal
without necessarily removing every capability. WABI records known diminished
operation. EPOCHÉ replaces the normal application surface with suspension and
an explicit reset path. There is no in-session override-and-continue control.
The compiler likewise emits only the EPOCHÉ block when suspended.

This is a containment choice, not a proof of immunity. A recognized attack
should become visible and terminate the affected workflow early. An
unrecognized attack may remain ZANSHIN. The lexicon makes state and audit
meaning explicit, but the names themselves do not prevent injection.

The integrity decision occurs synchronously before asynchronous hashing. Local
writes pass through a serialized queue, and publication rejects results from a
superseded session queue. These mechanisms address the interval in which UI
state, event generation, and evidence publication could otherwise disagree.

## 5. Bounded class closure

### 5.1 Stated replacement semantics

Let `F(x) = NFKC(remove_Cf(x))`, with removal preceding normalization. For
tripwire predicate `P`, the effective predicate is `P(x) OR P(F(x))`. The fold
has no project-code dependencies and does not replace the original input's
length admission or the original content used in a permitted model request.
This is a declared lexical equivalence policy. Its relationship to an LLM's
perception is a hypothesis motivating the policy, not an established semantic
oracle.

The raw view is necessary. Two JSON member names that differ in raw text may
normalize to the same key; parsing the normalized text can collapse a five-key
object into four keys. A folded-only density or unknown-field check can
therefore erase exactly the structure needed to recognize an attack. Existing
regressions exercise this collapse and the opposite case, a compatibility-form
protected key that the folded view recognizes.

### 5.2 Generated domain and recurrence gates

The fold suite enumerates every category-Cf scalar in the executing Node
runtime's Unicode tables and inserts each at every position in nine baseline
strings. It asserts preservation of every baseline-fired identifier, not merely
that some neighboring detector fires. A generator floor prevents an empty or
silently shrunken domain from passing. The scope is insertion into those
baselines under those runtime tables; it is not all strings, all Unicode, or
all meanings.

Separate recurrence checks require detection to retain both views and a single
pattern-evaluation path. Markup-sink linting rejects HTML-parsing DOM sinks,
including in generated UI primitives, and an eval mutates source examples to
verify that the lint gate fires. Behavioral enforcement tests then exercise
state escalation and event creation. Structural checks of component wiring are
reported as structural evidence, not browser-level execution proof.

### 5.3 Gate/runner composition and verifier adequacy

Apatea's original monotonicity, determinism, and extent checks permit a constant
high-risk assessor to pass. A function that always emits the same score cannot
be lowered by transformations; that establishes nothing about discrimination.
A direct replay against the original runner accepted constant-zero (759
checks), constant-high (1,476 checks), empty atoms (zero checks), and an unknown
transformation selection (42 baseline checks and zero variants). All four are
rejected after repair; the before/after receipt is `verifier-adequacy.json`.
This is a four-mutant instrument check, not a full ablation experiment.

The repaired runner requires target-owned positive and benign controls, checks
assessment shape and finite scores in range, and refuses empty atom corpora,
unknown transformations, empty selections, and zero-variant searches. CLI exit
1 denotes findings; exit 2 denotes inability to complete the search. CI checks
the exact exit code rather than treating any nonzero outcome as rediscovery.

Case changes to shell commands are excluded because they change the consumer's
meaning. The reference assessor's ASCII boundaries are protected from the
case-insensitive flag, and the mutation edges include Kelvin sign, long s,
dotted I, and dotless i. These repairs improve the instrument's stated
contract. They do not convert the existing transformation algebra into a
universal semantics-preservation oracle.

The STELE adapter calls production `gate()` through a long-lived JSONL bridge;
it does not copy the detector into Python. It uses five positive policy atoms
and selects case, Unicode boundary adjacency, and invisible boundary mutations.
Form reshaping is excluded from that adapter because its meaning would require
a separate consumer-specific policy. Extent assertions for this adapter are
vacuous because STELE's gate does not extract parameters; the report's count
must not be mistaken for additional extraction evidence.

## 6. Evaluation and integration findings

The accompanying evidence directory records the preflight revisions, exact
pairing pins, deterministic parity projections, audit reports, and runner
summaries. Reproduction commands appear in `reproduction.md`.

| Evaluation | Observed result | Interpretation |
| --- | --- | --- |
| STELE tests after mirror repair | 147 tests pass | Security, schema, queue, mirror, and recurrence regressions under tested runtime |
| Core tests after version metadata | 56 tests pass | Pure/schema/auth perimeter tests; no production database implied |
| Aletheia Python | 44 tests pass | Assessor, policy, hook, and inventory regressions |
| Aletheia contract parity | 77 vectors agree | Compared projection only; not every policy behavior |
| Aletheia Unicode parity | 819 vectors agree | Bounded generated corpus; named cases need not be distinct text |
| Apatea tests | 19 tests pass | Includes constant/malformed/empty-search controls |
| Apatea against Aletheia | 883 variants, 1,808 invariant checks, zero findings | Declared transformation domain at pinned gate revision |
| Apatea against reference control | 883 variants, 1,640 checks, zero findings | Discriminating reference for the bounded policy |
| Apatea against STELE gate | 190 variants, 390 checks, zero findings | Five atoms and three selected mutation families |

These totals are not independent Bernoulli trials and do not support confidence
intervals for real-world injection recall. The listed invariant-check totals do
not include the additional target-control calls. The release's production
verification is recorded separately because a unit test cannot certify a
Cloudflare binding, a database schema, or public route reachability.

A hosted-browser replay submitted a synthetic override phrase with U+200B
inside its keyword. The UI entered EPOCHÉ with KAPU-001 and three local audit
entries. Network observation recorded three successful event submissions and
zero Anthropic requests during the monitored gate/reset flow. Reset restored
ZANSHIN and cleared the synthetic key. This supports the actual UI wiring for
that case; it does not establish all possible render schedules or network
conditions. See `browser-production.json` and `production-epoche.png`.

### 6.1 A valid chain can still omit evidence

Review of the browser adapter found that it forwarded only the last event of a
published local trail. A single gate decision can append several TOBIRA events
and an integrity transition. Forwarding only the last entry yields an internally
consistent server chain with missing detection evidence. Replay cannot discover
those absent submissions: it verifies what arrived.

The repaired adapter computes the new suffix of each local trail, submits every
entry in order, and binds the queue to one session's asynchronous token-creation
promise. Reset drains already-queued local hashing before closing the old mirror after durable writes and creates a separate
mirror for the new session. Regression tests cover multi-entry decisions,
duplicate publication, delayed token creation, and cross-session reset. Network
calls have bounded timeouts and the mirror remains best effort. Successful
local enforcement does not promise delivery after transport errors or tab exit.

### 6.2 Deployment validation remains a separate experiment

The release protocol exercises synthetic session creation, administrative-route
denial, cross-session-token denial, twelve concurrent appends with bounded
serialization retries, server replay, malformed boolean rejection, closure,
and rejection of a post-closure append. It stores status-only receipts and
keeps issued tokens in memory. An initial pre-release probe found HTTP 500 on
the deployed append path despite passing local tests. The adapter mapped a
serialization conflict to `DriverAdapterError.cause.kind = TransactionWriteConflict`
before Prisma's P2034 normalization. The classifier now recognizes that exact
shape, with regressions refusing lookalike messages and unrelated errors. The deployed repair passed the same twelve-append probe with nine bounded
serialization retries: replay returned `valid: true, entries: 12`. Administrative
and cross-session requests were denied with 401, a malformed boolean was
rejected with 400, and append after closure returned 409. Both successful-probe
sessions were closed. See `release-evidence/core-production.json` for the
version identifier and status-only receipt. Two earlier failed probe runs each
created two synthetic sessions before cleanup was added; their transient tokens
were not retained. This residual is recorded rather than deleting ledger data.

## 7. Residual threats and validity limits

Intra-word separators, visual homoglyphs, encoded directive contents, and novel
semantic paraphrases remain outside the demonstrated fold closure. NBSP can
normalize into a literal space inside a keyword and remain outside the lexical
policy. The existing quarantine tests retain these distinctions. Cross-runtime
agreement on a saved corpus is not proof that every Unicode category or regex
construct behaves identically.

The model API key remains in the browser tier. Preventing markup sinks reduces
one exposure path; it does not protect the key from a compromised origin,
extension, developer tool, or malicious build. A boolean credential recognizer
also cannot determine whether otherwise ordinary project text is confidential.
The external model provider remains a disclosure boundary.

The durable mirror is optional for a downloaded offline bundle and enabled
explicitly for a hosted build. Its best-effort transport can omit events under
outage. Session creation has no application-level abuse quota, and no
rate-limit capacity experiment is reported. Session capabilities identify
possession, not a human principal. A holder may author false events for its own
session. Hash-chain validity must not be interpreted as completeness,
authenticity, or independent attestation.

Dependency audit results are time-specific observations. The repaired core and
Aletheia TypeScript lockfiles report zero advisories at this evaluation. The
STELE build tree retains GHSA-vfj7-8cjw-p6xm in `braces`, reached through
`vite-plugin-singlefile` and `micromatch` [3]. No patched upstream version was
listed. The current build uses trusted configuration patterns rather than
paste text at that call site; the advisory remains present. This distinction
supports a scoped risk assessment, not an advisory-free claim.

Finally, this study lacks a blinded held-out semantic attack set, realistic
operator-confirmation measurements, a complete verifier ablation study, and
independent replication. It should be read as a systems engineering case
study. Claims about broad prevention, state-of-the-art detection, or exhaustive
class closure would exceed the evidence.

## 8. Discussion

The useful unit of closure is an assurance contract: a stated policy, a bounded
transformation domain, a detector implementation, an enforcement boundary,
controls that can falsify the verifier, pinned consumer composition, and
reconstructable runtime evidence. No single test substitutes for the others.
The raw/fold union addresses representation mismatch. Non-vacuity controls
address a different problem, an instrument that cannot distinguish useful
behavior from constant output. The mirror repair addresses evidence that can
be lost even when local detection and durable replay each work as designed.

STELE's deliberate suspension posture makes recognized uncertainty actionable,
but it should not convert unrecognized uncertainty into a claim of trust.
ZANSHIN remains a system state under a specified policy, not a certificate that
content is benign. A report that preserves the remaining perimeter is part of
the mechanism: it tells the operator which conclusions the evidence permits.

## References

1. Kai Greshake, Sahar Abdelnabi, Shailesh Mishra, Christoph Endres, Thorsten
   Holz, Mario Fritz. *Not what you've signed up for: Compromising Real-World
   LLM-Integrated Applications with Indirect Prompt Injection*. 2023.
   https://arxiv.org/abs/2302.12173
2. Eric Wallace et al. *The Instruction Hierarchy: Training LLMs to Prioritize
   Privileged Instructions*. 2024. https://arxiv.org/abs/2404.13208
3. GitHub Advisory Database. *braces vulnerable to stack-exhaustion denial of
   service through deeply nested patterns*, GHSA-vfj7-8cjw-p6xm, CVE-2026-93687.
   Accessed October 16, 2026. https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
4. STELE implementation and architecture records, especially ADR-0001 through
   ADR-0006, `src/lib/security.ts`, `tripwires.ts`, `extraction-schema.ts`,
   `enforcement.ts`, `audit.ts`, `durable-audit.ts`, and the pinned release
   evidence accompanying this draft. https://github.com/mazze93/stele
5. Aletheia implementation, policy, recurrence inventory, and parity corpora.
   Exact release revision in `evals/pairing-lock.json`.
   https://github.com/mazze93/aletheia
6. Apatea invariant catalogue, target controls, transformation eligibility, and
   reference assessors. Exact release revision in `evals/pairing-lock.json`.
   https://github.com/mazze93/apatea

## Artifact and publication statement

This is a prepared research draft. It has no arXiv identifier, no asserted venue
acceptance, and no claimed Hugging Face Paper Page. The paper-publisher workflow
can index a paper once a genuine arXiv identifier exists; the present work does
not fabricate one. Release provenance and remaining runtime limitations are
reported in `release-evidence/` and the release journal.
