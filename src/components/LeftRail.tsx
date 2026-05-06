import { PROJECTS, POSTURE_META } from '@/data/projects'
import { SESSION_PRESETS } from '@/data/defaults'
import type { DirectiveState, SessionMode, OutputTarget } from '@/lib/types'
import type { GateResult } from '@/lib/security'

type Props = {
  state: DirectiveState
  onChange: (n: DirectiveState) => void
  onApplyPreset: (m: SessionMode) => void
  onGateResult?: (r: GateResult) => void
}
const MODES: SessionMode[] = ['PLAN','BUILD','REVIEW','CAPTURE']
const TARGETS: { id: OutputTarget; label: string; hint: string }[] = [
  { id:'claude-ai',         label:'claude.ai instructions', hint:'Paste into Settings › Instructions' },
  { id:'claude-md-global',  label:'CLAUDE.md global',       hint:'Save to ~/.claude/CLAUDE.md' },
  { id:'claude-md-project', label:'CLAUDE.md project',      hint:'Save to <project-root>/CLAUDE.md' },
]

export function LeftRail({ state, onChange, onApplyPreset, onGateResult: _onGateResult }: Props) {
  function toggleProject(id: string) {
    const next = state.activeProjectIds.includes(id)
      ? state.activeProjectIds.filter(p => p !== id)
      : [...state.activeProjectIds, id]
    onChange({ ...state, activeProjectIds: next })
  }
  return (
    <aside style={{ display:'flex', flexDirection:'column', gap:'24px', padding:'20px 16px', width:'220px', flexShrink:0, borderRight:'1px solid var(--border-color)', overflowY:'auto' }}>
      <section>
        <h3 style={head}>Projects</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:'3px', marginTop:'10px' }}>
          {PROJECTS.map(p => {
            const active = state.activeProjectIds.includes(p.id)
            const meta = POSTURE_META[p.posture]
            return (
              <button key={p.id} onClick={() => toggleProject(p.id)} title={meta.description}
                style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', minHeight:'44px', background:active?'var(--surface-raised)':'transparent', border:`1px solid ${active?'var(--teal)':'transparent'}`, borderRadius:'3px', cursor:'pointer', textAlign:'left', width:'100%', transition:'all 0.12s', touchAction:'manipulation' }}>
                <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:meta.color, flexShrink:0 }} />
                <span style={{ fontFamily:'var(--mono-font)', fontSize:'11px', color:active?'var(--vellum)':'var(--vellum-dim)', lineHeight:1.3 }}>{p.label}</span>
              </button>
            )
          })}
        </div>
      </section>
      <section>
        <h3 style={head}>Session Mode</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:'3px', marginTop:'10px' }}>
          {MODES.map(mode => {
            const active = state.sessionMode === mode
            return (
              <button key={mode} onClick={() => onApplyPreset(mode)} title={SESSION_PRESETS[mode].description}
                style={{ padding:'8px 10px', minHeight:'44px', background:active?'var(--surface-raised)':'transparent', border:`1px solid ${active?'var(--gold)':'transparent'}`, borderRadius:'3px', cursor:'pointer', width:'100%', transition:'all 0.12s', touchAction:'manipulation', fontFamily:'var(--mono-font)', fontSize:'11px', color:active?'var(--gold)':'var(--vellum-dim)', textAlign:'left' }}>
                [{mode}]
              </button>
            )
          })}
        </div>
        <p style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)', marginTop:'6px', lineHeight:1.5 }}>
          {SESSION_PRESETS[state.sessionMode].description}
        </p>
      </section>
      <section>
        <h3 style={head}>Output Target</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:'3px', marginTop:'10px' }}>
          {TARGETS.map(t => {
            const active = state.outputTarget === t.id
            return (
              <button key={t.id} onClick={() => onChange({ ...state, outputTarget:t.id })}
                style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', padding:'8px 10px', minHeight:'44px', background:active?'var(--surface-raised)':'transparent', border:`1px solid ${active?'var(--teal-bright)':'transparent'}`, borderRadius:'3px', cursor:'pointer', width:'100%', gap:'2px', touchAction:'manipulation' }}>
                <span style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:active?'var(--teal-bright)':'var(--vellum-dim)' }}>{t.label}</span>
                {active && <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)' }}>{t.hint}</span>}
              </button>
            )
          })}
        </div>
      </section>
    </aside>
  )
}
const head: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--vellum-dim)', margin:0 }
