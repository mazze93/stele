# STELE — Handoff Kickoff

**Tool:** STELE — egregore compiler and integrity telemetry  
**Output of this tool:** the egregore — a compiled Claude directive that governs session behavior  
**Operator:** daedalus · MBP M3 ARM64 · zsh · /opt/homebrew

---

## What this is

STELE compiles project configuration into governed Claude instruction sets. It visualizes
integrity state, renders a live Jaccard coupling matrix of 13 TOBIRA tripwires, and will
accept arbitrary paste input for osmotic project inheritance (Group 4 — not yet built).

The compiled output is called the **egregore**. The tool is the **stele**. This naming
is load-bearing — see `CLAUDE.md` for the full lexicon and why it matters for security.

---

## Read before writing a single line of code

1. `CLAUDE.md` — lexicon, intentional fragility philosophy, build sequencing as governance
2. `src/lib/integrity.ts` — state machine; zero dependencies; everything imports from it
3. `src/lib/tripwires.ts` — 13 TOBIRA, Jaccard matrix, `scanInput()`
4. `src/lib/security.ts` — Group 1 gate; correct interface; awaits Group 2 wiring
5. `src/lib/extraction-schema.ts` — Group 1 validator; awaits Group 4 consumers

The TESSERA section in `CLAUDE.md` and in `src/data/projects.ts` (directive-remixer project)
lists every function that exists but is not yet called. These are not bugs. They are the
next build phase.

---

## Active working tree

```
stele/
├── CLAUDE.md                          ← read first
├── KICKOFF.md                         ← this file
├── bundle.html                        ← current build, self-contained
├── src/
│   ├── lib/
│   │   ├── types.ts                   ← Tessera type lives here
│   │   ├── integrity.ts               ← state machine root
│   │   ├── tripwires.ts               ← 13 TOBIRA + Jaccard matrix
│   │   ├── audit.ts                   ← UTSUROI trail (inert — Group 2)
│   │   ├── compiler.ts                ← egregore assembly
│   │   ├── security.ts                ← Group 1 gate (built, awaits wiring)
│   │   └── extraction-schema.ts       ← Group 1 validator (built, awaits wiring)
│   ├── data/
│   │   ├── projects.ts                ← 7 projects including STELE itself
│   │   ├── defaults.ts                ← escalation triggers with scope
│   │   └── themes.ts                  ← 5 themes
│   ├── hooks/
│   │   ├── useIsMobile.ts
│   │   └── useTheme.ts
│   └── components/
│       ├── App.tsx                    ← EPOCHÉ lockout chrome lives here
│       ├── LeftRail.tsx
│       ├── LeverPanel.tsx             ← 6 tabs including 歪 UTSUROI
│       ├── MobileConfig.tsx
│       ├── OutputPanel.tsx
│       └── panels/
│           ├── FormatPanel.tsx        ← dnd-kit drag + mobile tap fallback
│           ├── EscalationPanel.tsx    ← scoped trigger display
│           ├── QuestionsPanel.tsx
│           ├── AppendPanel.tsx
│           ├── ThemePanel.tsx
│           └── UtsuroiPanel.tsx       ← coupling matrix + TESSERA display
```

---

## BUILD SEQUENCING — non-negotiable

**Group 1** — DONE. `security.ts` and `extraction-schema.ts` exist with correct interfaces.

**Group 2** — NEXT. Wire the inert functions. All three are in the TESSERA list:
- `escalate()` from `integrity.ts` → call in App.tsx when `firedTobiraIds` changes
- `scanInput()` from `tripwires.ts` → call before any external input reaches API or state
- `appendEntry()` from `audit.ts` → call at every `integrityState` transition

Pattern for Group 2 wiring in App.tsx:
```ts
import { escalate, integrityHash } from '@/lib/integrity'
import { appendEntry } from '@/lib/audit'

// When TOBIRA fires:
const nextState = escalate(currentIntegrityState, tobira.transition)
const hash = integrityHash(nextState, state.sessionId, Date.now())
// setState with new integrityState + firedTobiraIds
// appendEntry to audit trail
```

**Group 3** — Compiler integrity block. Already wired. Verify it emits correct EPOCHÉ
output by selecting STELE project, switching to output panel, manually setting
`integrityState` to 'EPOCHÉ' in console and observing the lockout.

**Group 4** — Only after Group 2 is complete and reviewed:
- `src/lib/extractor.ts` — API call with hardened system prompt
- `src/components/panels/InheritPanel.tsx` — paste zone, TOBIRA gate, diff view
- `src/components/panels/CollaboratorPanel.tsx` — narrative field extractor

**Group 5** — Parallel to Groups 2–3:
- Convert `SessionMode` union in `types.ts` to `CustomMode` data registry in `src/data/modes.ts`

---

## What the UTSUROI panel shows

The 歪 UTSUROI tab in the lever panel renders:
- Live integrity state banner with capability restrictions (✓/✗)  
- 8×8 Jaccard coupling matrix — color shifts when modules have fired TOBIRA
- Detail panel on cell click: resonance score, module pair, co-compromise risk interpretation
- TESSERA section — unjoined implementations for active projects
- TOBIRA registry — all 13 gates with fire status

The coupling matrix is computed from real vocabulary overlap between TOBIRA patterns
(`computeCouplingMatrix()` in `tripwires.ts`). It is not decorative.

---

## Lexicon — enforce in all new code

Do not use these words in compiled output strings, audit codes, or UI state labels:
`clean` `compromise` `failure` `inherit` `safe` `breach` `infected` `corrupt`

Use instead: `ZANSHIN` `EPOCHÉ` `WABI` `UNHEIMLICH` `TOBIRA` `KOHAKU` `TSUGI` `KIRI`

Deviation from this vocabulary in compiled output is itself a TOBIRA signal (KOTODAMA-FILTER).

---

## Dev commands

```zsh
cd ~/dev/stele
pnpm dev                    # Vite dev server
pnpm build                  # production build
npx tsc -p tsconfig.app.json --noEmit   # type check
# bundle to single HTML:
bash /path/to/bundle-artifact.sh
```

---

## CollaboratorPanel — what it needs to be

This is not yet built but the design is settled. It is a **narrative extractor**, not a
feedback panel. The developer fills in structured data (stack, hardStops, tesserae). The
model reads those and writes the narrative fields the developer can't easily articulate
from inside the work:
- `identity` — what this thing is philosophically
- `philosophy` — the values encoded in its architecture  
- `buildSequencing` — why the order is the order
- `unstatedConstraints` — what the code implies but doesn't say

The system prompt for the extraction call should frame Claude as a philosopher-scribe:
strict schema compliance, STELE lexicon, no hedging. The developer reviews and accepts
or rejects each narrative field via diff. The model proposes. The developer is final authority.

The API call goes through `extractor.ts` which goes through `gate()` in `security.ts`.
No API call opens before that chain exists.
