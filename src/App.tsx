import { useState } from 'react'
import type { DirectiveState, SessionMode } from '@/lib/types'
import type { IntegrityState } from '@/lib/integrity'
import type { ThemeId } from '@/data/themes'
import { buildDefaultState, applySessionPreset } from '@/data/defaults'
import { INTEGRITY_STATES } from '@/lib/integrity'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTheme } from '@/hooks/useTheme'
import { LeftRail } from '@/components/LeftRail'
import { LeverPanel } from '@/components/LeverPanel'
import { OutputPanel } from '@/components/OutputPanel'
import { MobileConfig } from '@/components/MobileConfig'
import './App.css'

type MobileTab = 'config' | 'levers' | 'output'
const MOBILE_TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id:'config', label:'Config', icon:'⊞' },
  { id:'levers', label:'Levers', icon:'⊜' },
  { id:'output', label:'Output', icon:'⊟' },
]

export default function App() {
  const [state, setState]         = useState<DirectiveState>(buildDefaultState)
  const [mobileTab, setMobileTab] = useState<MobileTab>('config')
  const isMobile                  = useIsMobile()
  const integrity                 = INTEGRITY_STATES[state.integrityState as IntegrityState]
  useTheme(state.themeId as ThemeId)

  function applyPreset(mode: SessionMode) { setState(prev => applySessionPreset(prev, mode)) }

  function handleMobileConfigChange(next: DirectiveState) {
    const justGotFirstProject = state.activeProjectIds.length === 0 && next.activeProjectIds.length > 0
    setState(next)
    if (justGotFirstProject) setMobileTab('levers')
  }

  // EPOCHÉ: entire UI enters lockout — only reset path available
  if (state.integrityState === 'EPOCHÉ') {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:integrity.colorDim, color:integrity.color, alignItems:'center', justifyContent:'center', padding:'40px', textAlign:'center', gap:'24px' }}>
        <div style={{ fontSize:'48px', fontFamily:'serif' }}>{integrity.glyph}</div>
        <div style={{ fontFamily:'var(--mono-font)', fontSize:'14px', letterSpacing:'0.1em' }}>EPOCHÉ</div>
        <div style={{ fontFamily:'var(--mono-font)', fontSize:'11px', color:'rgba(200,80,128,0.8)', maxWidth:'480px', lineHeight:1.8 }}>
          {integrity.description}<br /><br />
          The egregore is suspended — not destroyed. ZANSHIN is recoverable.<br />
          Only a deliberate reset restores clean state.
        </div>
        <button onClick={() => setState(buildDefaultState())}
          style={{ padding:'12px 32px', background:'transparent', border:`1px solid ${integrity.color}`, borderRadius:'4px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'12px', color:integrity.color, letterSpacing:'0.1em', touchAction:'manipulation' }}>
          RESET — restore ZANSHIN
        </button>
        <div style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'rgba(200,80,128,0.4)', marginTop:'8px' }}>
          session: {state.sessionId} · {state.firedTobiraIds.length} TOBIRA fired
        </div>
      </div>
    )
  }

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
        </div>
        {!isMobile && <StatusChips state={state} />}
      </header>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {isMobile ? (
          <div style={{ flex:1, overflow:'hidden' }}>
            {mobileTab==='config' && <div style={{ height:'100%', overflowY:'auto' }}><MobileConfig state={state} onChange={handleMobileConfigChange} onApplyPreset={applyPreset} /></div>}
            {mobileTab==='levers' && <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}><LeverPanel state={state} onChange={setState} /></div>}
            {mobileTab==='output' && <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}><OutputPanel state={state} fullWidth /></div>}
          </div>
        ) : (
          <>
            <LeftRail state={state} onChange={setState} onApplyPreset={applyPreset} />
            <LeverPanel state={state} onChange={setState} />
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
