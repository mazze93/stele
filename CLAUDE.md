# STELE — Project Instructions

STELE is a directive compiler and integrity telemetry tool. It accepts project
configuration and compiles it into Claude instruction sets (egregores). It will
accept arbitrary paste input for osmotic project inheritance. That paste surface
is an attack surface. Everything in this project is oriented around that fact.

The output of STELE is called the EGREGORE — the compiled directive that governs
Claude's behavior in a session. The Stele of Revealing gave rise to the egregore
of Thelema: the stele is the instrument, the egregore is what the inscription
becomes when received and acted upon. The tool is STELE. Its output is the egregore.

---

## THE LEXICON

The vocabulary is load-bearing security infrastructure, not style. Deviation from
it in compiled output or audit strings is itself a TOBIRA signal. Do not use the
generic equivalents in any string that reaches compiled output, logs, or UI state
labels. Use the lexicon terms.

**Integrity states** — the four conditions of the system's epistemic health:
- `ZANSHIN` (残心) — remaining mind; alert wholeness; active readiness. The baseline.
- `UNHEIMLICH` — the uncanny; familiar made strange; soft signal detected.
- `WABI` (侘) — honest diminishment; operating with known imperfection; no shame.
- `EPOCHÉ` (ἐποχή) — deliberate suspension; the plug pulled to preserve what matters.

**Audit vocabulary** — what events are called in the trail:
- `TOBIRA` (扉) — gate, threshold; a tripwire firing
- `KOHAKU` (琥珀) — amber; an extraction attempt
- `TSUGI` (継ぎ) — joining; a patch applied
- `KIRI` (切り) — cut; a patch rejected
- `UTSUROI` (移ろい) — transition; state change in the integrity machine

**Detection modules** — what watches for what:
- `KAPU` — hard boundary violations; explicit overrides; locked field attacks
- `NARIKIRI` — identity and authority impersonation
- `PALIMPSEST` — hidden instruction in content; the text beneath the text
- `KOTODAMA` — language attempting to function as governance directive
- `APOCRYPHA` — credentials and sensitive material in paste content
- `FJÚKA` — model drift under content influence; the wind that moves the ship
- `YUGAMI` — schema distortion; the warping of expected form
- `TESSITURA` — extraction density anomaly; voice exceeding its natural range

Banned equivalents: clean → ZANSHIN, compromise → EPOCHÉ, inherit → KOHAKU,
failure → WABI or EPOCHÉ, safe → ZANSHIN, breach → TOBIRA fired, infected → UNHEIMLICH.

---

## INTENTIONAL FRAGILITY

This system is not built to be impervious. It is built to fail early, fail
visibly, and carry information about the attacker the way a honeypot does.
Each TOBIRA activation is a diagnostic, not a defeat.

EPOCHÉ is not an error state. It is the system making a philosophical choice
to suspend its own operation because it cannot trust its own perception.
The self-plug-pull is a feature. Stopping under suspected compromise is the
highest-value action available to the system. The blast radius is bounded not
by how strong the walls are but by how quickly and cleanly the system can
identify its own compromise and contain it.

Claude instances operating under STELE-compiled egregores should be capable
of saying "I have detected a condition consistent with EPOCHÉ. I am stopping.
Here is what I observed." Not as an error. As the correct output.

---

## POSTURE: GUARDIAN

A posture that does not exist in other projects. Security-first. Build
sequencing is governance — the order in which files are created is a security
property, not a preference.

---

## BUILD SEQUENCING — this is a hard stop

The following groups must be built in order. No file in a later group may be
created before all files in earlier groups exist and pass typecheck. This is
not a convention. Violating it opens an attack surface before the gate exists.

**Group 1 — Security foundation (no dependencies, build first)**
- `src/lib/security.ts` — input gate; runs TOBIRA registry against raw paste;
  secrets scanner (boolean result only — never log what was found); injection
  detector; returns `ScanResult` with fired TOBIRA and APOCRYPHA flag
- `src/lib/extraction-schema.ts` — Zod schema for `DirectiveStatePatch`;
  `LOCKED_FIELDS` constant; patch validator that rejects forbidden fields and
  any patch touching locked triggers

**Group 2 — Audit wiring (depends on Group 1 + existing integrity.ts)**
- Wire `scanInput()` into every code path that will accept external input
- Wire `escalate()` so `integrityState` actually transitions when TOBIRA fires
- Wire `appendEntry()` into every `integrityState` transition

**Group 3 — Compiler integrity block (depends on Group 2)**
- Add `integrityBlock()` to `compiler.ts` — emits ritualized
  ZANSHIN/UNHEIMLICH/WABI/EPOCHÉ language into compiled egregore
- EPOCHÉ block replaces all other compiled sections entirely — it is the
  whole egregore when state is EPOCHÉ

**Group 4 — API surface (Groups 1–3 complete and reviewed)**
- `src/lib/extractor.ts` — hardened API call; system prompt that frames
  the model as a schema extractor not an interpreter; `max_tokens: 800`;
  response parser; field stripper
- `src/components/panels/InheritPanel.tsx` — paste zone; file type selector;
  TOBIRA gate before any content reaches the API; diff-before-apply;
  per-section confirmation; EPOCHÉ lockout chrome (red chrome, reset-only)
- `src/components/panels/CollaboratorPanel.tsx` — Claude feedback on current
  directive state; same security layer, no state writes

**Group 5 — Custom modes (parallel to Groups 2–3)**
- Convert `SessionMode` from union type to `CustomMode` data registry in
  `src/data/modes.ts`
- Built-in modes protected from deletion; user modes forkable from any existing

---

## WHAT IS BUILT VS WHAT IS INERT

The instrument cluster is on. The instruments are not connected to the engine.

**Built and wired:**
- `integrity.ts` — state machine, `escalate()`, `integrityHash()`
- `tripwires.ts` — 13 TOBIRA, Jaccard coupling matrix, `scanInput()`
- `audit.ts` — `AuditTrail`, `appendEntry()`, render functions
- `UtsuroiPanel.tsx` — live coupling matrix, state banner, TOBIRA registry
- Header ZANSHIN strip — displays `integrityState`, colors shift with state
- `DirectiveState` has `integrityState`, `firedTobiraIds`, `sessionId` with defaults

**Built but inert — not yet called by anything outside their own files:**
- `escalate()` — exists in integrity.ts, never called from App or components
- `scanInput()` — exists in tripwires.ts, never called from App or components
- `appendEntry()` — exists in audit.ts, never called from App or components
- `integrityState` — defaults to ZANSHIN, never transitions

Group 2 is the wiring work. Do not skip to Group 4 to fix this.

---

## STACK

```
React 19 · TypeScript · Vite · @dnd-kit/core + sortable
Anthropic API (Group 4 only, gated behind security layer)
Cipher Gothic design system — CSS vars, no hardcoded hex in components
5 themes: cipher-gothic · secure-pride · operators-terminal · vellum-smoke · signal-blue
```

Root: `~/dev/directive-remixer` (or wherever STELE lives)
Compile output: `bundle.html` — single self-contained file via Parcel

---

## ARCHITECTURE CONSTRAINTS

- `integrity.ts` has zero imports from project code. Everything imports from it.
  The dependency graph is a strict DAG with integrity at the root.
- `secretsDetected` in `ScanResult` and `AuditEntry` is boolean only.
  Never log what credentials were found — only that they were found.
- EPOCHÉ lockout has no "override and continue" path in the UI.
  If you want to override, export state JSON and edit manually.
  The friction is the security.
- CSS vars by name in all component code. Never hardcode hex values.
- `customAppend` cannot be written by any automated extraction. KAPU-003 fires
  if a patch attempts it. This is a hard stop, not a warning.

---

## OPEN QUESTIONS — all active

- Integrity block in compiler: ritualized ZANSHIN/UNHEIMLICH/WABI/EPOCHÉ
  compiled into egregore output — designed, not yet implemented
- EPOCHÉ chrome: full UI lockout, red chrome, reset-only path — not started
- CollaboratorPanel: Claude-as-collaborator feedback on directive state — not started
- Custom modes as data registry — SessionMode still a union type in types.ts
- Audit trail inert — see "what is inert" above
