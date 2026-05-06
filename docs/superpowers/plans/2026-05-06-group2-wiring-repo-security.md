# Group 2 Wiring + Repo Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `escalate()`, `appendEntry()`, and `session-start` into App.tsx; fix `gate()` return type; surface the audit trail in the header and UtsuroiPanel; show TOBIRA diagnostic on the EPOCHÉ lockout screen; harden the repo with CI, dependabot, branch protection, and a PR template.

**Architecture:** `buildSession()` seeds both `DirectiveState` and `AuditTrail` atomically so they share a `sessionId`. `handleGateResult()` in App.tsx is the single wiring point — it calls `escalate()`, `appendEntry()`, and both state setters. All audit entry metadata is derived from the locally-computed `nextIntegrity` variable, never from the stale closure value of `state.integrityState`.

**Tech Stack:** React 19, TypeScript, Vite — existing. No new dependencies.

---

## File Map

| file | action | responsibility |
|------|--------|----------------|
| `src/lib/security.ts` | modify | `GateResult.recommendedTransition: StateTransition \| null`; `ORDER_INDEX`; fail-closed guard; findings-first loop |
| `src/App.tsx` | modify | `buildSession()`; `auditTrail` state; `handleGateResult()`; `session-start` effect; `handleReset()`; `auditCount` in header; EPOCHÉ TOBIRA detail |
| `src/components/LeftRail.tsx` | modify | add `onGateResult?: (r: GateResult) => void` to Props |
| `src/components/panels/UtsuroiPanel.tsx` | modify | `auditTrail: AuditTrail` prop; `UTSUROI TRAIL` section; memoized display |
| `src/data/projects.ts` | modify | remove T-001, T-003, T-007, T-008 from directive-remixer tesserae |
| `.github/workflows/typecheck.yml` | create | GitHub Actions tsc check |
| `.github/dependabot.yml` | create | weekly npm dependency updates |
| `.github/pull_request_template.md` | create | PR template with integrity metadata |
| `SECURITY.md` | create | security policy |

---

## Task 1: Fix `gate()` return type — `StateTransition | null`

**Files:**
- Modify: `src/lib/security.ts`

This is the foundational type change. Everything downstream (`handleGateResult` in App.tsx) depends on `recommendedTransition` being `null`-safe.

- [ ] **Replace the entire contents of `src/lib/security.ts`:**

```ts
// === SECURITY GATE — GROUP 1 ===
// Input gate. Runs TOBIRA registry against raw paste before anything
// reaches the API or state. This file must exist and be reviewed before
// InheritPanel, CollaboratorPanel, or extractor.ts are created (Group 4).
//
// GROUP 4 WIRING: call gate() from InheritPanel/CollaboratorPanel paste handlers.
// handleGateResult() in App.tsx handles escalate() and appendEntry() on GateResult.

import { scanPasteInput } from './tripwires'
import { INTEGRITY_STATES } from './integrity'
import type { IntegrityState, StateTransition } from './integrity'
import type { ScanResult } from './tripwires'

export type GateResult = {
  blocked: boolean
  scanResult: ScanResult
  recommendedTransition: StateTransition | null  // null = clean input, no transition needed
  findings: string[]
  charCount: number
}

const MAX_INPUT_CHARS = 8000

// Module-scope: O(1) severity lookup. Never use indexOf() inside loops.
const ORDER_INDEX: Record<string, number> = Object.fromEntries(
  (['ZANSHIN', 'UNHEIMLICH', 'WABI', 'EPOCHÉ'] as const).map((s, i) => [s, i])
)

// gate() — call this before any external input reaches API or state.
// Returns a GateResult. Never throws — caller decides what to do with the result.
export function gate(input: string): GateResult {
  const findings: string[] = []
  const charCount = input.length

  if (charCount > MAX_INPUT_CHARS) {
    return {
      blocked: true,
      scanResult: { fired: [], clean: false, secretsDetected: false },
      recommendedTransition: 'WABI',
      findings: [`Input exceeds ${MAX_INPUT_CHARS} character limit (${charCount} chars). Truncation could hide adversarial content — rejecting.`],
      charCount,
    }
  }

  const scanResult = scanPasteInput(input)
  let recommendedTransition: StateTransition | null = null

  for (const tobira of scanResult.fired) {
    findings.push(`[${tobira.auditCode}] ${tobira.message}`)  // always before any guard

    const incoming = ORDER_INDEX[tobira.transition]
    if (incoming === undefined) {
      findings.push('[SYS_ANOMALY] Unrecognized integrity transition — failing closed.')
      return { blocked: true, scanResult, recommendedTransition: 'EPOCHÉ', findings, charCount }
    }

    const current = recommendedTransition ? ORDER_INDEX[recommendedTransition] : -1
    if (incoming > current) recommendedTransition = tobira.transition
  }

  if (scanResult.secretsDetected) {
    findings.push('APOCRYPHA: Credential material detected. Content will not be transmitted.')
  }

  const blocked =
    recommendedTransition === 'EPOCHÉ' ||
    recommendedTransition === 'WABI'   ||
    scanResult.secretsDetected

  return { blocked, scanResult, recommendedTransition, findings, charCount }
}

// Utility: describe capability restrictions at a given state
export function capabilityReport(state: IntegrityState): string[] {
  const s = INTEGRITY_STATES[state]
  return [
    `Extraction: ${s.allowsExtraction ? 'permitted' : 'suspended'}`,
    `API calls: ${s.allowsApiCalls ? 'permitted' : 'suspended'}`,
    `State writes: ${s.allowsStateWrites ? 'permitted' : 'suspended'}`,
    `Patch application: ${s.allowsPatchApplication ? 'permitted' : 'suspended'}`,
  ]
}
```

- [ ] **Verify typecheck passes:**

```bash
cd "/Users/daedalus/🚀 PROJECTS/stele" && npx tsc --noEmit 2>&1 | grep -v "baseUrl\|ts6"
```

Expected: no output (clean).

- [ ] **Commit:**

```bash
git add src/lib/security.ts
git commit -m "fix(security): gate() returns StateTransition|null; ORDER_INDEX; fail-closed guard"
```

---

## Task 2: Wire `App.tsx` — state co-init and `handleGateResult`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Replace the import block at the top of `src/App.tsx`:**

```tsx
import { useState, useEffect, useRef } from 'react'
import type { DirectiveState, SessionMode } from '@/lib/types'
import type { IntegrityState } from '@/lib/integrity'
import type { ThemeId } from '@/data/themes'
import { buildDefaultState, applySessionPreset } from '@/data/defaults'
import { INTEGRITY_STATES, escalate, integrityHash } from '@/lib/integrity'
import { createAuditTrail, appendEntry } from '@/lib/audit'
import type { AuditTrail } from '@/lib/audit'
import type { GateResult } from '@/lib/security'
import { TOBIRA_REGISTRY } from '@/lib/tripwires'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTheme } from '@/hooks/useTheme'
import { LeftRail } from '@/components/LeftRail'
import { LeverPanel } from '@/components/LeverPanel'
import { OutputPanel } from '@/components/OutputPanel'
import { MobileConfig } from '@/components/MobileConfig'
import './App.css'
```

- [ ] **Add `buildSession()` immediately before the `MOBILE_TABS` constant (before the App component):**

```tsx
function buildSession() {
  const state = buildDefaultState()
  return { state, audit: createAuditTrail(state.sessionId) }
}
```

- [ ] **Replace the existing state declarations inside `App()` (the `useState` lines and `integrity`/`useTheme` calls) with:**

```tsx
const [session]                   = useState(buildSession)
const [state, setState]           = useState<DirectiveState>(session.state)
const [auditTrail, setAuditTrail] = useState<AuditTrail>(session.audit)
const [mobileTab, setMobileTab]   = useState<MobileTab>('config')
const isMobile                    = useIsMobile()
const integrity                   = INTEGRITY_STATES[state.integrityState as IntegrityState]
const sessionStarted              = useRef(false)
useTheme(state.themeId as ThemeId)
```

- [ ] **Add the `session-start` effect immediately after the `useTheme` call:**

```tsx
useEffect(() => {
  if (sessionStarted.current) return          // StrictMode second-fire guard
  sessionStarted.current = true               // set before any state call or async boundary
  setAuditTrail(t => appendEntry(t, 'session-start', {
    integrityHash: integrityHash('ZANSHIN', session.state.sessionId, 0),
  }))
}, [])  // eslint-disable-line react-hooks/exhaustive-deps
```

Note: `session.state.sessionId` (not `state.sessionId`) — reads from the stable seed object, not the reactive closure.

- [ ] **Add `handleGateResult` after the `applyPreset` function:**

```tsx
function handleGateResult(gateResult: GateResult) {
  const { scanResult, recommendedTransition } = gateResult
  if (!recommendedTransition) return  // clean input — latching invariant, no de-escalation

  const currentIntegrity = state.integrityState as IntegrityState
  const nextIntegrity    = escalate(currentIntegrity, recommendedTransition)
  const nextFiredIds     = [...new Set([...state.firedTobiraIds, ...scanResult.fired.map(t => t.id)])]
  const hash             = integrityHash(nextIntegrity, state.sessionId, 0)

  // Snapshot invariant: use nextIntegrity everywhere below — never state.integrityState
  setState(prev => ({ ...prev, integrityState: nextIntegrity, firedTobiraIds: nextFiredIds }))

  setAuditTrail(trail => {
    let t = trail
    for (const tobira of scanResult.fired) {
      t = appendEntry(t, 'tobira-fired', {
        tobiraId: tobira.id,
        tobiraCode: tobira.auditCode,
        integrityHash: hash,
        secretsDetected: scanResult.secretsDetected,
      })
    }
    if (nextIntegrity !== currentIntegrity) {
      t = appendEntry(t, nextIntegrity === 'EPOCHÉ' ? 'epoche-entered' : 'utsuroi-transition', {
        fromState: currentIntegrity,
        toState: nextIntegrity,
        integrityHash: hash,
      })
    }
    return { ...t, currentState: nextIntegrity }
  })
}
```

- [ ] **Add `handleReset` after `handleGateResult`:**

```tsx
function handleReset() {
  const newState = buildDefaultState()
  setState(newState)
  setAuditTrail(createAuditTrail(newState.sessionId))
}
```

- [ ] **Verify typecheck passes:**

```bash
npx tsc --noEmit 2>&1 | grep -v "baseUrl\|ts6"
```

Expected: no output.

- [ ] **Commit:**

```bash
git add src/App.tsx
git commit -m "feat(app): buildSession co-init; handleGateResult wires escalate+appendEntry; session-start effect; handleReset"
```

---

## Task 3: Update EPOCHÉ screen + header audit count + thread `onGateResult`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/LeftRail.tsx`

- [ ] **Replace the EPOCHÉ early-return block in `App()`. Find the block starting with `if (state.integrityState === 'EPOCHÉ')` and replace it entirely:**

```tsx
if (state.integrityState === 'EPOCHÉ') {
  const firedTobira = state.firedTobiraIds.map(id =>
    TOBIRA_REGISTRY.find(t => t.id === id)
    ?? { auditCode: 'UNKNOWN', message: 'Unregistered integrity exception.' }
  )
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:integrity.colorDim, color:integrity.color, alignItems:'center', justifyContent:'center', padding:'40px', textAlign:'center', gap:'24px' }}>
      <div style={{ fontSize:'48px', fontFamily:'serif' }}>{integrity.glyph}</div>
      <div style={{ fontFamily:'var(--mono-font)', fontSize:'14px', letterSpacing:'0.1em' }}>EPOCHÉ</div>
      <div style={{ fontFamily:'var(--mono-font)', fontSize:'11px', color:'rgba(200,80,128,0.8)', maxWidth:'480px', lineHeight:1.8 }}>
        {integrity.description}<br /><br />
        The egregore is suspended — not destroyed. ZANSHIN is recoverable.<br />
        Only a deliberate reset restores clean state.
      </div>
      {firedTobira.length > 0 && (
        <div style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'rgba(200,80,128,0.7)', maxWidth:'480px', textAlign:'left', display:'flex', flexDirection:'column', gap:'4px', padding:'12px 16px', border:'1px solid rgba(200,80,128,0.3)', borderRadius:'4px', background:'rgba(200,80,128,0.06)', width:'100%' }}>
          <div style={{ letterSpacing:'0.1em', marginBottom:'6px', color:'rgba(200,80,128,0.5)', fontSize:'8px' }}>TOBIRA FIRED THIS SESSION</div>
          {firedTobira.map((t, i) => (
            <div key={i}>[{t.auditCode}] {t.message}</div>
          ))}
        </div>
      )}
      <button onClick={handleReset}
        style={{ padding:'12px 32px', background:'transparent', border:`1px solid ${integrity.color}`, borderRadius:'4px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'12px', color:integrity.color, letterSpacing:'0.1em', touchAction:'manipulation' }}>
        RESET — restore ZANSHIN
      </button>
      <div style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'rgba(200,80,128,0.4)', marginTop:'8px' }}>
        session: {state.sessionId} · {state.firedTobiraIds.length} TOBIRA fired · {auditTrail.entries.length} audit entries
      </div>
    </div>
  )
}
```

- [ ] **In the header JSX, find the integrity strip `<div>` and add the audit count badge after the TOBIRA badge. The inner content of the integrity strip should become:**

```tsx
<span style={{ fontFamily:'serif', fontSize:'14px', color:integrity.color }}>{integrity.glyph}</span>
<span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:integrity.color, letterSpacing:'0.1em' }}>{integrity.label}</span>
{state.firedTobiraIds.length > 0 && (
  <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:integrity.color, borderLeft:`1px solid ${integrity.color}`, paddingLeft:'8px' }}>{state.firedTobiraIds.length} TOBIRA</span>
)}
{auditTrail.entries.length > 0 && (
  <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:integrity.color, borderLeft:`1px solid ${integrity.color}`, paddingLeft:'8px', opacity:0.7 }}>{auditTrail.entries.length} ◈</span>
)}
```

- [ ] **Update the `LeftRail` call in App.tsx to thread `onGateResult`:**

Find:
```tsx
<LeftRail state={state} onChange={setState} onApplyPreset={applyPreset} />
```

Replace with:
```tsx
<LeftRail state={state} onChange={setState} onApplyPreset={applyPreset} onGateResult={handleGateResult} />
```

- [ ] **In `src/components/LeftRail.tsx`, update the `Props` type and destructure:**

Find:
```tsx
type Props = { state: DirectiveState; onChange: (n: DirectiveState) => void; onApplyPreset: (m: SessionMode) => void }
```

Replace with:
```tsx
import type { GateResult } from '@/lib/security'

type Props = {
  state: DirectiveState
  onChange: (n: DirectiveState) => void
  onApplyPreset: (m: SessionMode) => void
  onGateResult?: (r: GateResult) => void
}
```

And update the destructure:
```tsx
export function LeftRail({ state, onChange, onApplyPreset, onGateResult: _onGateResult }: Props) {
```

(Prefixed `_` suppresses unused-variable warnings until Group 4 uses it. If the linter doesn't require this, just destructure as `onGateResult`.)

- [ ] **Verify typecheck passes:**

```bash
npx tsc --noEmit 2>&1 | grep -v "baseUrl\|ts6"
```

Expected: no output.

- [ ] **Commit:**

```bash
git add src/App.tsx src/components/LeftRail.tsx
git commit -m "feat(app): EPOCHÉ TOBIRA diagnostic; header audit count; thread onGateResult to LeftRail"
```

---

## Task 4: UtsuroiPanel — `UTSUROI TRAIL` section

**Files:**
- Modify: `src/components/panels/UtsuroiPanel.tsx`

- [ ] **Add `AuditTrail` import and update Props at the top of `UtsuroiPanel.tsx`:**

Add to imports:
```tsx
import { useMemo } from 'react'  // add useMemo — useState is already imported
import type { AuditTrail } from '@/lib/audit'
```

Update Props type (find `type Props = ...`):
```tsx
type Props = { state: DirectiveState; integrityState: IntegrityState; firedTobiraIds: string[]; auditTrail: AuditTrail }
```

Update destructure:
```tsx
export function UtsuroiPanel({ state, integrityState, firedTobiraIds, auditTrail }: Props) {
```

- [ ] **Add the memoized display array immediately after the `matrix` useMemo (around line 13):**

```tsx
const displayTrail = useMemo(
  () => [...auditTrail.entries].slice(-30).reverse(),
  [auditTrail.entries]
)
```

- [ ] **Append the `UTSUROI TRAIL` section after the closing `</div>` of the TOBIRA registry section (end of the component's return, before the final `</div>`):**

```tsx
{/* UTSUROI TRAIL */}
<div style={{ background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'4px', padding:'14px' }}>
  <p style={{ ...sHead, marginBottom:'12px' }}>
    UTSUROI TRAIL — {auditTrail.entries.length} {auditTrail.entries.length === 1 ? 'entry' : 'entries'} · session {auditTrail.sessionId}
  </p>
  {displayTrail.length === 0 ? (
    <div style={{ padding:'16px', textAlign:'center', border:'1px dashed var(--border-color)', borderRadius:'3px' }}>
      <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)' }}>no entries — session start pending</span>
    </div>
  ) : (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            {(['time','action','tobira','hash'] as const).map(h => (
              <th key={h} style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum-faint)', fontWeight:'normal', textAlign:'left', padding:'2px 6px', letterSpacing:'0.1em', borderBottom:'1px solid var(--border-color)', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayTrail.map((entry, i) => {
            const isStructural = entry.action === 'session-start'
            const isThreat     = ['tobira-fired','utsuroi-transition','epoche-entered'].includes(entry.action)
            const rowColor     = isStructural ? 'var(--vellum-faint)' : isThreat ? integrity.color : 'var(--vellum-dim)'
            return (
              <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum-faint)', padding:'3px 6px', whiteSpace:'nowrap' }}>
                  {entry.timestamp.split('T')[1]?.split('.')[0] ?? '—'}
                </td>
                <td style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:rowColor, padding:'3px 6px', whiteSpace:'nowrap' }}>
                  {entry.action}
                </td>
                <td style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum-faint)', padding:'3px 6px', whiteSpace:'nowrap' }}>
                  {entry.tobiraCode ?? '—'}
                </td>
                <td style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum-faint)', padding:'3px 6px', maxWidth:'8ch', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' }}>
                  {entry.integrityHash}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )}
</div>
```

- [ ] **Find where UtsuroiPanel is used in `LeverPanel.tsx` (or wherever it's rendered) and pass the `auditTrail` prop.** Search for `<UtsuroiPanel`:

```bash
grep -r "UtsuroiPanel" src/ --include="*.tsx" -l
```

Open that file, find the `<UtsuroiPanel` call, and add `auditTrail={auditTrail}`. You will need to thread `auditTrail` down from App.tsx through whatever intermediate component renders UtsuroiPanel.

- [ ] **Verify typecheck passes:**

```bash
npx tsc --noEmit 2>&1 | grep -v "baseUrl\|ts6"
```

Expected: no output.

- [ ] **Commit:**

```bash
git add src/components/panels/UtsuroiPanel.tsx
git add $(git diff --name-only)  # catch any intermediate components modified
git commit -m "feat(utsuroi): UTSUROI TRAIL section — live audit log with memoized display"
```

---

## Task 5: Tessera cleanup

**Files:**
- Modify: `src/data/projects.ts`

- [ ] **In `src/data/projects.ts`, inside the `directive-remixer` project's `tesserae` array, remove the four entries with ids `T-001`, `T-003`, `T-007`, and `T-008`.** Leave T-002, T-004, T-005, T-006, T-009, T-010 intact.

The remaining tesserae array should be:

```ts
tesserae: [
  {
    id: 'T-002',
    module: 'scanPasteInput() in src/lib/tripwires.ts',
    missingHalf: 'call site in InheritPanel paste handler (Group 4)',
    blockedBy: 'security.ts and extraction-schema.ts must exist first (Group 1)',
    group: 2,
  },
  {
    id: 'T-004',
    module: 'gate() in src/lib/security.ts',
    missingHalf: 'import and call in InheritPanel before any API call',
    blockedBy: 'InheritPanel does not exist yet (Group 4)',
    group: 4,
  },
  {
    id: 'T-005',
    module: 'validatePatch() in src/lib/extraction-schema.ts',
    missingHalf: 'import and call in extractor.ts response handler',
    blockedBy: 'extractor.ts does not exist yet (Group 4)',
    group: 4,
  },
  {
    id: 'T-006',
    module: 'scanExtractionResponse() in src/lib/tripwires.ts',
    missingHalf: 'import and call in extractor.ts on API response payload before validatePatch()',
    blockedBy: 'extractor.ts does not exist yet (Group 4)',
    group: 4,
  },
  {
    id: 'T-009',
    module: 'integrityHash() in src/lib/integrity.ts — 32-bit djb2',
    missingHalf: 'upgrade to crypto.subtle.digest SHA-256 if audit hashes are compared programmatically; current strength adequate for human-read display',
    group: 2,
  },
  {
    id: 'T-010',
    module: 'tesserae field in src/lib/types.ts Project type',
    missingHalf: 'declared Tessera[] (required) but compiler.ts uses tesserae?.length — resolve: mark optional or remove optional chain',
    group: 1,
  },
],
```

- [ ] **Verify typecheck passes:**

```bash
npx tsc --noEmit 2>&1 | grep -v "baseUrl\|ts6"
```

Expected: no output.

- [ ] **Commit:**

```bash
git add src/data/projects.ts
git commit -m "chore(tessera): close T-001 T-003 T-007 T-008 — all wired in this PR"
```

---

## Task 6: Repo security files

**Files:**
- Create: `.github/workflows/typecheck.yml`
- Create: `.github/dependabot.yml`
- Create: `.github/pull_request_template.md`
- Create: `SECURITY.md`

- [ ] **Create `.github/workflows/typecheck.yml`:**

```yaml
name: typecheck
on: [push, pull_request]
jobs:
  tsc:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit
```

- [ ] **Create `.github/dependabot.yml`:**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    labels:
      - dependencies
```

- [ ] **Create `.github/pull_request_template.md`:**

```markdown
## What
<!-- one sentence -->

## Integrity
- Group: 1 / 2 / 3 / 4 / 5
- Tesserae resolved: T-xxx / none
- Tesserae opened: T-xxx / none

## Test
- [ ] `npx tsc --noEmit` passes
- [ ] Dev server starts clean
```

- [ ] **Create `SECURITY.md`:**

```markdown
# Security Policy

STELE is a directive compiler with an adversarial paste surface. Its output
governs Claude's behavior in sessions. This makes it a meaningful attack target.

## Reporting a Vulnerability

Report security issues privately to **mazze.leczzare@protonmail.com**.

Do not open a public GitHub issue for security vulnerabilities.

There is no formal CVE process. Direct contact is preferred and sufficient.
Include: what you found, how to reproduce it, and what you believe the impact is.

## Scope

The primary attack surface is the paste input zone (Group 4 — not yet implemented).
The TOBIRA detection system, gate() function, and integrity state machine are
all relevant attack targets.
```

- [ ] **Commit the security files:**

```bash
git add .github/workflows/typecheck.yml .github/dependabot.yml .github/pull_request_template.md SECURITY.md
git commit -m "chore(repo): typecheck CI, dependabot, PR template, security policy"
```

- [ ] **Apply branch protection via GitHub API:**

```bash
gh api repos/mazze93/stele/branches/main/protection \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  -f "required_status_checks[strict]=false" \
  -f "required_status_checks[contexts][]=tsc" \
  -f "enforce_admins=true" \
  -F "required_pull_request_reviews[required_approving_review_count]=0" \
  -F "required_pull_request_reviews[dismiss_stale_reviews]=true" \
  -F "restrictions=null" \
  -F "allow_force_pushes=false" \
  -F "allow_deletions=false" 2>&1
```

Expected: JSON response containing `"url": "https://api.github.com/repos/mazze93/stele/branches/main/protection"`.

If the API call fails, verify with:
```bash
gh api repos/mazze93/stele/branches/main/protection 2>&1 | head -20
```

---

## Task 7: Open PR

- [ ] **Push the branch and open a PR:**

```bash
git checkout -b feat/group2-wiring-repo-security
git push -u origin feat/group2-wiring-repo-security
gh pr create \
  --title "feat(group2): audit wiring, telemetry surface, repo security" \
  --body "$(cat <<'EOF'
## What
Group 2 wiring complete. Audit trail live. Repo hardened.

## Integrity
- Group: 2
- Tesserae resolved: T-001, T-003, T-007, T-008
- Tesserae opened: none

## Changes
- `gate()` returns `StateTransition | null`; `ORDER_INDEX` O(1) lookup; fail-closed on unknown transitions
- `buildSession()` seeds DirectiveState + AuditTrail atomically
- `handleGateResult()` wires `escalate()` + `appendEntry()` in App.tsx
- `session-start` audit entry on mount (StrictMode-safe)
- EPOCHÉ screen shows fired TOBIRA detail before reset
- Header shows live audit entry count (`◈`)
- UtsuroiPanel: `UTSUROI TRAIL` section with memoized log table
- LeftRail: `onGateResult?` prop ready for Group 4
- `.github/`: typecheck CI, dependabot, PR template
- `SECURITY.md`: security policy
- Branch protection: no force-push, no delete, PRs required, tsc required

## Test
- [ ] `npx tsc --noEmit` passes
- [ ] Dev server starts clean
- [ ] Header shows `◈ 1` after session-start fires
- [ ] UtsuroiPanel shows session-start entry in UTSUROI TRAIL
- [ ] EPOCHÉ screen: manually set `integrityState: 'EPOCHÉ'` and `firedTobiraIds: ['TW-001']` in buildDefaultState temporarily — confirm TOBIRA detail renders, then revert
EOF
)"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] §1 State co-init → Task 2 (`buildSession`, `useState` triple)
- [x] §2 `handleGateResult` → Task 2; `session-start` → Task 2; `handleReset` → Task 2; `onGateResult` threading → Task 3
- [x] §3 `gate()` type fix + `ORDER_INDEX` + fail-closed → Task 1
- [x] §4 Header audit count → Task 3; UtsuroiPanel trail → Task 4; EPOCHÉ TOBIRA detail → Task 3
- [x] §5 All four repo security files + branch protection → Task 6
- [x] §6 Tessera cleanup (T-001, T-003, T-007, T-008 removed) → Task 5

**Snapshot invariant:** Task 2 `handleGateResult` uses `nextIntegrity` throughout; `state.integrityState` is only read once at the top to compute `currentIntegrity`, then replaced by `nextIntegrity` for all subsequent operations.

**useRef guard:** Task 2 effect: `if (sessionStarted.current) return` first, then `sessionStarted.current = true`, then `setAuditTrail`.

**Type consistency:** `StateTransition | null` defined in Task 1, consumed in Task 2. `AuditTrail` used in Tasks 2 and 4 — same type from `@/lib/audit`. `GateResult` defined in Task 1, consumed in Tasks 2 and 3.

**UtsuroiPanel threading:** Task 4 notes that the caller of `<UtsuroiPanel>` must be found and updated — this is an implementation-time lookup, not a spec gap. The `grep` command in Task 4 finds it.
