# Narrative Export — Design Spec
**Date:** 2026-05-07  
**Status:** Approved — proceed to implementation  
**Feature:** `projectNarratives` export as structured JSON envelope  

---

## Problem

`projectNarratives` entries exist only in session state. The philosopher-scribe
(CollaboratorPanel) authors four narrative fields that are immediately useful in
a Claude session but vanish on reset. The current workflow requires the user to
manually copy field values into `projects.ts` — no structured format, no
provenance, no architectural context.

---

## Goal

Produce a single-file JSON export that carries both the narrative fields and the
architectural context needed to use them: posture, stack, hard stops, tesserae,
compliance requirements, and a confounds block identifying known attack surface
risks for this project class.

The export is a working artifact — something a developer pastes into a Claude
session as a bootstrap context, or archives alongside a project.

---

## Export Envelope

Two top-level sections, one file:

```ts
type ProjectNarrativeExport = {
  steleVersion:   string          // "0.0.0" from package.json
  exportedAt:     string          // ISO 8601 timestamp
  projectId:      string
  sessionId:      string
  integrityState: IntegrityState  // ZANSHIN | UNHEIMLICH | WABI | EPOCHÉ

  narrative: {
    identity?:            string
    philosophy?:          string
    buildSequencing?:     string
    unstatedConstraints?: string
  }

  architecture: {
    posture:        string
    stack:          string
    hardStops:      string[]
    tesserae:       Array<{ module: string; missingHalf: string; group: string }>
    compliance:     string[]
    confounds:      ConfoundsBlock
    haltConditions: string[]   // human-readable EPOCHÉ/WABI trigger conditions
  }
}
```

`narrative.*` is the session overlay (what the philosopher-scribe authored plus
any user edits). `architecture.*` is derived entirely from `project` + `state`
at export time — no user-authored content.

---

## Confounds

### Type definitions

```ts
type ConfoundStatus = {
  status:           'unaddressed' | 'flagged-by-heuristic' | 'human-reviewed'
  note?:            string   // only set via UI; never by heuristic
  heuristicSource?: string   // the matching hardStop text when flagged-by-heuristic
}

type ConfoundsBlock = {
  policyEngineTargeting:   ConfoundStatus
  baselineDrift:           ConfoundStatus
  timingOracle:            ConfoundStatus
  fakeMultiParty:          ConfoundStatus
  fragilityMetaMonitoring: ConfoundStatus
  palimpsestKotodama:      ConfoundStatus
}
```

### Heuristic keywords

`buildConfoundsBlock` runs a keyword match over `project.hardStops` only —
never over narrative fields or user-supplied text.

| Confound key              | Keywords matched (case-insensitive)                         |
|---------------------------|-------------------------------------------------------------|
| `policyEngineTargeting`   | "policy engine", "trust issuer", "signing key"              |
| `baselineDrift`           | "baseline", "rolling window", "pinned"                      |
| `timingOracle`            | "backoff", "retry", "timing"                                |
| `fakeMultiParty`          | "multi-party", "approval", "out-of-band"                    |
| `fragilityMetaMonitoring` | "watchdog", "meta-monitor", "fragility gate"                |
| `palimpsestKotodama`      | "prompt injection", "PALIMPSEST", "KOTODAMA"                |

When a keyword matches: emit `status: 'flagged-by-heuristic'`, set
`heuristicSource` to the first matching hardStop string verbatim.

When no keyword matches: emit `status: 'unaddressed'`. No `note`, no `heuristicSource`.

### Hard constraint

`buildConfoundsBlock` **never emits `status: 'mitigated'`**. That status is not
in the type. `human-reviewed` is the ceiling reachable through the UI, and it
only applies when the user has explicitly written a non-empty note for that row.
The distinction between "reviewed" and "mitigated" is load-bearing: this tool
does not assert that risks are resolved.

---

## Pure Functions — `src/lib/narrativeExport.ts`

```ts
function buildConfoundsBlock(project: Project): ConfoundsBlock
```
- Input: `Project` (static data from `projects.ts`)
- Output: `ConfoundsBlock` — all six keys populated
- Side effects: none
- Reads: `project.hardStops` only

```ts
function buildProjectNarrativeExport(
  project:       Project,
  state:         DirectiveState,
  sessionId:     string,
  confoundNotes: Record<string, string>   // local component state, not DirectiveState
): ProjectNarrativeExport
```
- Pure function — no I/O, no side effects
- `confoundNotes` keys are confound field names; non-empty value sets
  `status: 'human-reviewed'` and `note: value` for that row
- `narrative.*` read from `state.projectNarratives?.[project.id]`
- `architecture.confounds` merges `buildConfoundsBlock(project)` with
  `confoundNotes` overrides
- `steleVersion` sourced from a `VERSION` constant (string literal in the file,
  not a runtime import from package.json)
- `exportedAt` set via `new Date().toISOString()` at call time

---

## UI — Inline Export Drawer

Location: **CollaboratorPanel.tsx**, below the "Apply to session" / "Discard" controls.

Visibility: Only rendered when `state.projectNarratives?.[selectedId]` has at
least one non-empty field.

### Drawer structure

```
[ Export narrative ▼ ]    ← button; click toggles drawer open/closed

When open:
┌─────────────────────────────────────────────┐
│ NARRATIVE PREVIEW                           │
│   identity      [read-only text]            │
│   philosophy    [read-only text]            │
│   buildSequencing [read-only text]          │
│   unstatedConstraints [read-only text]      │
├─────────────────────────────────────────────┤
│ CONFOUNDS                                   │
│   policyEngineTargeting    [chip: status]   │
│     ▶ Review               ← disclosure     │
│       [textarea: note]     ← when open      │
│   baselineDrift            [chip: status]   │
│     ▶ Review                                │
│   ...                                       │
├─────────────────────────────────────────────┤
│ [ Download JSON ]                           │
└─────────────────────────────────────────────┘
```

### Interaction

- Narrative preview: four `<p>` elements, not textareas (already editable above)
- Confound rows: each row has a status chip (`unaddressed` / `flagged` / `reviewed`)
  and a "Review" disclosure button. Clicking reveals a `<textarea>` for the note.
- Textarea `onChange` writes to `confoundNotes` local state
  (`Record<string, string>` keyed by confound field name)
- Status chip updates reactively: non-empty note → `human-reviewed`,
  `flagged-by-heuristic` (empty note) → `flagged`, else → `unaddressed`
- "Download JSON" calls `buildProjectNarrativeExport()` then triggers a browser
  download via `URL.createObjectURL(new Blob([JSON.stringify(export, null, 2)]))`.
  Filename: `stele-narrative-{projectId}-{date}.json`

### State owned by component (not DirectiveState)

```ts
const [exportOpen,    setExportOpen]    = useState(false)
const [confoundNotes, setConfoundNotes] = useState<Record<string, string>>({})
const [openRows,      setOpenRows]      = useState<Record<string, boolean>>({})
```

`confoundNotes` resets when `selectedId` changes (consistent with how `fields`
resets on project switch).

---

## Data Flow

| Field | Source |
|-------|--------|
| `narrative.*` | `state.projectNarratives[projectId]` (session overlay) |
| `architecture.posture` | `project.posture` |
| `architecture.stack` | `project.stack` |
| `architecture.hardStops` | `project.hardStops` |
| `architecture.tesserae` | `project.tesserae` (module + missingHalf + group only) |
| `architecture.compliance` | `project.compliance` |
| `architecture.confounds` | `buildConfoundsBlock(project)` + `confoundNotes` overrides |
| `architecture.haltConditions` | derived strings from `INTEGRITY_STATES` (EPOCHÉ/WABI entries) |
| `integrityState` | `state.integrityState` |
| `sessionId` | passed from App.tsx (already exists in `AuditEntry`) |
| `exportedAt` | `new Date().toISOString()` at download time |

---

## What Does Not Change

- `DirectiveState` — no new fields; `confoundNotes` lives in component state
- `AuditEntry` / `AuditAction` — no new audit event (export is a local download)
- `security.ts` / `gate()` — export path has no user-supplied input; no gate needed
- `compiler.ts` — export is orthogonal to egregore compilation

---

## Out of Scope

- Server upload or share link (local download only)
- Import / re-ingest of a previously exported envelope (future work)
- `status: 'mitigated'` — not in the type, not in the UI, not a goal of this tool
- Persisting `confoundNotes` across sessions

---

## Files Affected

| File | Change |
|------|--------|
| `src/lib/narrativeExport.ts` | **New** — `buildConfoundsBlock`, `buildProjectNarrativeExport`, types, `VERSION` const |
| `src/components/panels/CollaboratorPanel.tsx` | **Modified** — export drawer, `confoundNotes` state, download trigger |
| `src/lib/types.ts` | **Possibly modified** — add `sessionId: string` to `DirectiveState` if not already present |
