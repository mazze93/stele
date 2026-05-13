import { useState, useEffect, useRef } from 'react'
import type { DirectiveState } from '@/lib/types'
import type { IntegrityState } from '@/lib/integrity'
import type { ThemeId } from '@/data/themes'
import { buildDefaultState, applySessionPreset } from '@/data/defaults'
import { INTEGRITY_STATES, escalate, integrityHash } from '@/lib/integrity'
import { createAuditTrail, appendEntry } from '@/lib/audit'
import type { AuditTrail, AuditAction, AuditEntry } from '@/lib/audit'
import type { GateResult } from '@/lib/security'
import type { DirectiveStatePatch } from '@/lib/extraction-schema'
import type { NarrativeFields } from '@/lib/extractor'
import { TOBIRA_REGISTRY } from '@/lib/tripwires'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTheme } from '@/hooks/useTheme'
import { LeftRail } from '@/components/LeftRail'
import { LeverPanel } from '@/components/LeverPanel'
import { OutputPanel } from '@/components/OutputPanel'
import { MobileConfig } from '@/components/MobileConfig'
import './App.css'

type AuditExtras = Omit<Partial<AuditEntry>, 'integrityHash' | 'timestamp' | 'action' | 'sessionId'>

function buildSession() {
  const state = buildDefaultState()
  return { state, audit: createAuditTrail(state.sessionId) }
}

type MobileTab = 'config' | 'levers' | 'output'
const MOBILE_TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id:'config', label:'Config', icon:'⊞' },
  { id:'levers', label:'Levers', icon:'⊜' },
  { id:'output', label:'Output', icon:'⊟' },
]

export default function App() {
  const [session]       = useState(buildSession)
  const [state, setState]  = useState<DirectiveState>(session.state)
  const [apiKey, setApiKey] = useState('')
  const [mobileTab, setMobileTab] = useState<MobileTab>('config')
  const [auditCount, setAuditCount] = useState(0)
  const isMobile         = useIsMobile()
  const integrity        = INTEGRITY_STATES[state.integrityState as IntegrityState]
  const sessionStarted   = useRef(false)
  const auditTrailRef    = useRef<AuditTrail>(session.audit)
  useTheme(state.themeId as ThemeId)

  useEffect(() => {
    if (sessionStarted.current) return    // StrictMode second-fire guard
    sessionStarted.current = true         // set before any state call or async boundary
    auditTrailRef.current = appendEntry(auditTrailRef.current, 'session-start', {
      integrityHash: integrityHash('ZANSHIN', session.state.sessionId, 0),
    })
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  function applyPreset(mode: string) { setState(prev => applySessionPreset(prev, mode)) }

  function handleGateResult(gateResult: GateResult) {
    const { scanResult, recommendedTransition } = gateResult
    if (!recommendedTransition) return  // clean input — latching invariant, no de-escalation

    const currentIntegrity = state.integrityState as IntegrityState
    const nextIntegrity    = escalate(currentIntegrity, recommendedTransition)
    const nextFiredIds     = [...new Set([...state.firedTobiraIds, ...scanResult.fired.map(t => t.id)])]
    const hash             = integrityHash(nextIntegrity, state.sessionId, 0)

    // Snapshot invariant: use nextIntegrity everywhere below — never state.integrityState
    setState(prev => ({ ...prev, integrityState: nextIntegrity, firedTobiraIds: nextFiredIds }))

    // Direct ref mutation — no state update for audit entries
    for (const tobira of scanResult.fired) {
      auditTrailRef.current = appendEntry(auditTrailRef.current, 'tobira-fired', {
        tobiraId: tobira.id,
        tobiraCode: tobira.auditCode,
        integrityHash: hash,
        secretsDetected: scanResult.secretsDetected,
      })
    }
    if (nextIntegrity !== currentIntegrity) {
      auditTrailRef.current = appendEntry(
        auditTrailRef.current,
        nextIntegrity === 'EPOCHÉ' ? 'epoche-entered' : 'utsuroi-transition',
        { fromState: currentIntegrity, toState: nextIntegrity, integrityHash: hash }
      )
      auditTrailRef.current = { ...auditTrailRef.current, currentState: nextIntegrity }
    }
  }

  function handleApplyPatch(patch: DirectiveStatePatch) {
    setState(prev => {
      let next: DirectiveState = { ...prev }
      if (patch.activeProjectIds !== undefined) next.activeProjectIds = patch.activeProjectIds
      if (patch.verbosity       !== undefined) next.verbosity         = patch.verbosity
      if (patch.themeId         !== undefined) next.themeId           = patch.themeId
      if (patch.hygieneTrigger  !== undefined) next.hygieneTrigger    = patch.hygieneTrigger
      if (patch.sessionMode     !== undefined) next = applySessionPreset(next, patch.sessionMode)
      if (patch.openQuestions?.length) {
        const newQs = patch.openQuestions.map((q, i) => ({
          id:        `oq-${Date.now()}-${i}`,
          projectId: q.projectId,
          text:      q.text,
        }))
        next.openQuestions = [...prev.openQuestions, ...newQs]
      }
      return next
    })
  }

  function handleApplyNarrative(projectId: string, narrative: NarrativeFields) {
    setState(prev => ({
      ...prev,
      projectNarratives: { ...prev.projectNarratives, [projectId]: narrative },
    }))
  }

  // Appends to ref — no re-render. Uses ref's currentState to avoid stale closure.
  function handleAuditEntry(action: AuditAction, extras: AuditExtras = {}) {
    const hash = integrityHash(
      auditTrailRef.current.currentState,
      auditTrailRef.current.sessionId,
      Date.now(),
    )
    auditTrailRef.current = appendEntry(auditTrailRef.current, action, { ...extras, integrityHash: hash })
    setAuditCount(auditTrailRef.current.entries.length)
  }

  function handleReset() {
    const newState = buildDefaultState()
    setState(newState)
    auditTrailRef.current = createAuditTrail(newState.sessionId)
    setApiKey('')
  }

  function handleMobileConfigChange(next: DirectiveState) {
    const justGotFirstProject = state.activeProjectIds.length === 0 && next.activeProjectIds.length > 0
    setState(next)
    if (justGotFirstProject) setMobileTab('levers')
  }

  // EPOCHÉ: entire UI enters lockout — only reset path available
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
          session: {state.sessionId} · {state.firedTobiraIds.length} TOBIRA fired · {auditTrailRef.current.entries.length} audit entries
        </div>
      </div>
    )
  }

  const auditTrailSnapshot = auditTrailRef.current

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:'var(--cipher)', color:'var(--vellum)', overflow:'hidden' }}>
      <header style={{ height:'48px', flexShrink:0, display:'flex', alignItems:'center', padding:'0 16px', gap:'12px', borderBottom:'1px solid var(--border-color)', background:'var(--cipher)', zIndex:20 }}>
        <span style={{ fontFamily:'var(--heading-font)', fontSize:'15px', fontWeight:500, letterSpacing:'0.06em', color:'var(--vellum)', whiteSpace:'nowrap' }}>STELE</span>
        {!isMobile && <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)', letterSpacing:'0.08em' }}>egregore compiler · mazze · 2026</span>}
        <div style={{ flex:1 }} />
        {/* Integrity strip — always visible */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'4px 10px', border:`1px solid ${integrity.color}`, borderRadius:'3px', background:integrity.colorDim }}>
          <span style={{ fontFamily:'serif', fontSize:'14px', color:integrity.color }}>{integrity.glyph}</span>
          <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:integrity.color, letterSpacing:'0.1em' }}>{integrity.label}</span>
          {state.firedTobiraIds.length > 0 && (
            <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:integrity.color, borderLeft:`1px solid ${integrity.color}`, paddingLeft:'8px' }}>{state.firedTobiraIds.length} TOBIRA</span>
          )}
          {auditCount > 0 && (
            <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:integrity.color, borderLeft:`1px solid ${integrity.color}`, paddingLeft:'8px', opacity:0.7 }}>{auditCount} ◈</span>
          )}
        </div>
        {!isMobile && <StatusChips state={state} />}
      </header>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {isMobile ? (
          <div style={{ flex:1, overflow:'hidden' }}>
            {mobileTab==='config' && <div style={{ height:'100%', overflowY:'auto' }}><MobileConfig state={state} onChange={handleMobileConfigChange} onApplyPreset={applyPreset} /></div>}
            {mobileTab==='levers' && <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}><LeverPanel state={state} onChange={setState} auditTrail={auditTrailSnapshot} integrityState={state.integrityState as IntegrityState} apiKey={apiKey} onSetApiKey={setApiKey} onGateResult={handleGateResult} onApplyPatch={handleApplyPatch} onApplyNarrative={handleApplyNarrative} onAuditEntry={handleAuditEntry} /></div>}
            {mobileTab==='output' && <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}><OutputPanel state={state} fullWidth /></div>}
          </div>
        ) : (
          <>
            <LeftRail state={state} onChange={setState} onApplyPreset={applyPreset} />
            <LeverPanel state={state} onChange={setState} auditTrail={auditTrailSnapshot} integrityState={state.integrityState as IntegrityState} apiKey={apiKey} onSetApiKey={setApiKey} onGateResult={handleGateResult} onApplyPatch={handleApplyPatch} onApplyNarrative={handleApplyNarrative} onAuditEntry={handleAuditEntry} />
            <OutputPanel state={state} />
          </>
        )}
      </div>

      {isMobile && (
        <nav style={{ height:'56px', flexShrink:0, display:'flex', borderTop:'1px solid var(--border-color)', background:'var(--cipher)', zIndex:20 }}>
          {MOBILE_TABS.map(tab => {
            const active = mobileTab === tab.id
            const badge = tab.id==='config'&&state.activeProjectIds.length>0 ? String(state.activeProjectIds.length) : tab.id==='levers'&&state.openQuestions.length>0 ? String(state.openQuestions.length) : null
            return (
              <button key={tab.id} onClick={() => setMobileTab(tab.id)} aria-current={active?'page':undefined}
                style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3px', background:'transparent', border:'none', borderTop:`2px solid ${active?'var(--teal-bright)':'transparent'}`, cursor:'pointer', touchAction:'manipulation', position:'relative' }}>
                <span style={{ fontSize:'16px', opacity:active?1:0.4 }}>{tab.icon}</span>
                <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:active?'var(--teal-bright)':'var(--vellum-faint)', letterSpacing:'0.06em' }}>{tab.label}</span>
                {badge && <span style={{ position:'absolute', top:'6px', right:'calc(50% - 20px)', minWidth:'14px', height:'14px', padding:'0 3px', background:'var(--teal)', borderRadius:'7px', fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum)', display:'flex', alignItems:'center', justifyContent:'center' }}>{badge}</span>}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}

function StatusChips({ state }: { state: DirectiveState }) {
  const enabled = state.outputSections.filter(s => s.enabled).length
  const total   = state.outputSections.length
  return (
    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
      <Chip label={`[${state.sessionMode}]`}          color="var(--gold)" />
      <Chip label={state.verbosity}                    color="var(--vellum-dim)" />
      <Chip label={`${enabled}/${total} sections`}     color="var(--vellum-faint)" />
      {state.openQuestions.length > 0 && <Chip label={`${state.openQuestions.length} open`} color="var(--teal-bright)" />}
    </div>
  )
}
function Chip({ label, color }: { label:string; color:string }) {
  return <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color, padding:'3px 7px', border:`1px solid ${color}`, borderRadius:'2px', opacity:0.8, letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{label}</span>
}
