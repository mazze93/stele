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

**Group 4 — API surface (Groups 1–3 complete and reviewed)** ✓ COMPLETE
- `src/lib/extractor.ts` — hardened API call; system prompt that frames
  the model as a schema extractor not an interpreter; `max_tokens: 1000`;
  response parser; field stripper. Collaborator call: `max_tokens: 1500`.
- `src/components/panels/InheritPanel.tsx` — paste zone; TOBIRA gate before
  any content reaches the API; per-field checkbox confirm before patch applies;
  EPOCHÉ and WABI lockout branches distinct
- `src/components/panels/CollaboratorPanel.tsx` — philosopher-scribe narrative
  authoring for active projects; editable textareas pre-filled from model output;
  writes to `state.projectNarratives`; session-only (copy to projects.ts to persist)

**Group 5 — Custom modes (parallel to Groups 2–3)** ✓ COMPLETE
- `SessionMode` is now `string`; `CustomMode` data registry lives in `src/data/modes.ts`
- Built-in modes protected from deletion; user modes forkable from any existing
- `state.userModes: CustomMode[]` and `state.projectNarratives` added to `DirectiveState`

---

## CURRENT STATE — v1.0.0, Groups 1–5 complete + T-006 wired

All build groups are complete and wired. Released at v1.0.0 (May 2026;
`src/lib/version.ts`). `bundle.html` is the primary deliverable — a single
self-contained file dropped into a Claude session.

Grown since the v1.0.0 build groups (all post-date the sequencing above):
- `stele-core/` — separate Node service (own package.json, npm): Prisma
  Postgres persistence layer for the audit ledger. **Hono**, not Express —
  `createApp()` in `stele-core/src/server.ts` mounts routers from
  `stele-core/src/routes/` (sessions, projects, drift) via `app.route()`, with
  `@hono/zod-validator` against the schemas in `stele-core/src/schemas.ts`;
  `@hono/node-server` serves it from `stele-core/index.ts`. Migrations + seed
  under `stele-core/prisma/`. Don't reach for Express middleware idioms here.
- `site/` — stele.mazzeleczzare.com landing page + hosted app, deployed to
  the `stele` Cloudflare Pages project by direct upload (see `site/README.md`;
  `deploy/` is assembled at deploy time, never committed).
- Tests — vitest suites in `src/lib/__tests__/` covering security, tripwires,
  integrity, audit. Run before any security-layer change.
- `docs/adr/` — ADRs 0001–0003 (monotonic escalation, deterministic tripwires
  over model judges, boolean-only secret detection) — the written rationale
  behind the Architecture Constraints below.
- `docs/superpowers/{plans,specs}/` — dated design docs from earlier build
  phases (Group 2 wiring, narrative export). Historical: they record what was
  intended at the time, not necessarily what shipped. Check source before
  trusting one.
- `docs/journal/` — `CHECKPOINT.md` → `PLAN.md` → `DECISIONS.md`, in that
  order, is the cold-resume path for a long session. Append; never re-scaffold.

**Fully wired:**
- `integrity.ts` — `escalate()` called from `App.handleGateResult`; transitions fire on every TOBIRA
- `tripwires.ts` — `scanInput()` called from `security.gate()`; `gate()` called in InheritPanel and CollaboratorPanel before any API call
- `audit.ts` — `appendEntry()` called via `handleAuditEntry` ref; `auditTrailRef` is a `useRef` (no re-render per entry)
- `compiler.ts` — `integrityBlock()` emits ZANSHIN/UNHEIMLICH/WABI/EPOCHÉ language; EPOCHÉ replaces all other sections; compile-time warning on openQuestions that aren't genuine questions
- `App.tsx` — EPOCHÉ lockout is a full UI replacement (glyph, fired TOBIRA list, reset-only path); `auditCount` state syncs on every `handleAuditEntry` call
- `InheritPanel.tsx` — paste zone, gate-then-extract, per-field confirm, EPOCHÉ/WABI branches distinct; T-006 YUGAMI+TESSITURA pass on API response before `validatePatch()`
- `CollaboratorPanel.tsx` — active-projects-only selector, philosopher-scribe narrative, editable fields, session-only persistence note
- `modes.ts` — `CustomMode` registry; `BUILT_IN_MODES` protected; `findMode()` merges user modes
- `extractor.ts` — T-006 wired: scans API response payload for YUGAMI+TESSITURA before returning to InheritPanel

---

## STACK

```
React 19 · TypeScript · Vite · vite-plugin-singlefile · @dnd-kit/core + sortable
Tailwind v4 · Radix primitives + shadcn layer in src/components/ui · zod
Anthropic API (Group 4 only, gated behind security layer)
Cipher Gothic design system — CSS vars, no hardcoded hex in components
5 themes: cipher-gothic · secure-pride · operators-terminal · vellum-smoke · signal-blue
```

**Tailwind is v4.** PostCSS goes through `@tailwindcss/postcss` — a v3-style
`tailwindcss` plugin entry breaks the build. `components.json` configures the
shadcn generator; `@/` resolves to `src/` (`tsconfig.app.json` + `vite.config.ts`).

The Cipher Gothic rule and the Tailwind/Radix layer coexist: panels and
integrity-bearing UI are styled with CSS vars by name, and `src/components/ui`
holds the generated primitives. A hex literal in a component is a defect in
either layer.

Root: `~/Projects/tools/stele` (workspace v2, 2026-07-15 — see `~/Projects/WORKSPACE.md`)
Compile output: `dist/bundle.html` — single fully self-contained file (all JS/CSS inlined).
`vite-plugin-singlefile` is wired in `vite.config.ts` — no manual inlining required.

## COMMANDS

Package manager is **pnpm** (pnpm-lock.yaml — don't introduce npm/yarn lockfiles).

```bash
pnpm dev           # vite dev server (localhost:5173)
pnpm build         # tsc -b && vite build && mv dist/index.html → dist/bundle.html
pnpm preview       # preview dist/ locally
pnpm lint          # eslint
pnpm test          # vitest run — src/lib/__tests__ (security, tripwires, integrity, audit)
```

Single test file / single case:

```bash
pnpm test src/lib/__tests__/tripwires.test.ts     # one suite
npx vitest run -t "escalate never de-escalates"   # one case by name
npx vitest watch src/lib/__tests__/security.test.ts
```

`stele-core/` is its own package (npm, `stele-core/package-lock.json`):
`npm run dev` (tsx watch) / `npm start` from inside that directory. Its `npm
test` is still the exit-1 placeholder — it has no suite of its own.

## CI

`.github/workflows/typecheck.yml` runs on every push and pull request: pnpm 10 /
Node 24, `pnpm install --frozen-lockfile`, then `npx tsc --noEmit` **and**
`pnpm test`. A red suite blocks the same way a type error does — run both
locally before touching the security layer rather than discovering it in CI.

Also live: `codeql.yml` (code scanning), `release.yml`, and `claude.yml` /
`claude-code-review.yml` (skips Dependabot PRs). Every action is SHA-pinned —
keep it that way when editing a workflow.

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

## OPEN QUESTIONS

- **User mode fork UI** — still open, and the shape of the gap is now known.
  `state.userModes` is *read* in three places (`LeftRail.tsx:44,55`,
  `MobileConfig.tsx:38,48`) and merged by `findMode()` (`modes.ts:44`), but
  nothing writes it: there is no create/fork surface anywhere in the UI, so the
  array is permanently `[]` in practice. `userModes` is also on the extractor's
  forbidden-field list, which is correct and must stay — whatever UI gets built,
  modes are authored by the operator, never by extraction.

- **`projectNarratives` persistence — resolved, and the answer is "session-only."**
  Not an open question any more. `narrativeExport.ts` is imported only by
  `CollaboratorPanel.tsx`; there is no writer back into `src/data/projects.ts`.
  Narratives live in `state.projectNarratives` for the session and are lost on
  reset unless the operator copies them into `projects.ts` by hand. Treat the
  manual copy as the intended loop until someone decides otherwise — don't
  "fix" it by having the app write its own source files.

Resolved / retired (2026-07-15 audit):
- ~~T-009~~ — audit trail is SHA-256 hash-chained (`src/lib/audit.ts`); djb2 question is moot.
- ~~T-010~~ — referenced `src/policy/resolve.ts` no longer exists in this repo; re-file against the current home of policy resolution if the type inconsistency resurfaces.
