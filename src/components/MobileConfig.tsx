import type { DirectiveState, SessionMode } from '@/lib/types'
import { PROJECTS, POSTURE_META } from '@/data/projects'
import { SESSION_PRESETS } from '@/data/defaults'
const MODES: SessionMode[] = ['PLAN','BUILD','REVIEW','CAPTURE']
const TARGETS = [
  { id:'claude-ai' as const,         label:'claude.ai instructions', hint:'Paste into Settings › Instructions' },
  { id:'claude-md-global' as const,  label:'CLAUDE.md global',       hint:'Save to ~/.claude/CLAUDE.md' },
  { id:'claude-md-project' as const, label:'CLAUDE.md project',      hint:'Save to <project-root>/CLAUDE.md' },
]
type Props = { state: DirectiveState; onChange: (n: DirectiveState) => void; onApplyPreset: (m: SessionMode) => void }
export function MobileConfig({ state, onChange, onApplyPreset }: Props) {
  function toggleProject(id: string) {
    const next = state.activeProjectIds.includes(id)
      ? state.activeProjectIds.filter(p => p !== id)
      : [...state.activeProjectIds, id]
    onChange({ ...state, activeProjectIds: next })
  }
  return (
    <div style={{ padding:'20px 16px', display:'flex', flexDirection:'column', gap:'28px' }}>
      <section>
        <h3 style={head}>Projects</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginTop:'12px' }}>
          {PROJECTS.map(p => {
            const active = state.activeProjectIds.includes(p.id)
            const meta = POSTURE_META[p.posture]
            return (
              <button key={p.id} onClick={() => toggleProject(p.id)}
                style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px 10px', minHeight:'48px', background:active?'var(--surface-raised)':'var(--surface)', border:`1px solid ${active?'var(--teal)':'var(--border-color)'}`, borderRadius:'4px', cursor:'pointer', textAlign:'left', touchAction:'manipulation' }}>
                <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:meta.color, flexShrink:0 }} />
                <span style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:active?'var(--vellum)':'var(--vellum-dim)', lineHeight:1.3 }}>{p.label}</span>
              </button>
            )
          })}
        </div>
      </section>
      <section>
        <h3 style={head}>Session Mode</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginTop:'12px' }}>
          {MODES.map(mode => {
            const active = state.sessionMode === mode
            return (
              <button key={mode} onClick={() => onApplyPreset(mode)}
                style={{ padding:'12px 10px', minHeight:'48px', background:active?'var(--surface-raised)':'var(--surface)', border:`1px solid ${active?'var(--gold)':'var(--border-color)'}`, borderRadius:'4px', cursor:'pointer', touchAction:'manipulation', fontFamily:'var(--mono-font)', fontSize:'11px', color:active?'var(--gold)':'var(--vellum-dim)' }}>
                [{mode}]
              </button>
            )
          })}
        </div>
        <p style={hint}>{SESSION_PRESETS[state.sessionMode].description}</p>
      </section>
      <section>
        <h3 style={head}>Output Target</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginTop:'12px' }}>
          {TARGETS.map(t => {
            const active = state.outputTarget === t.id
            return (
              <button key={t.id} onClick={() => onChange({ ...state, outputTarget:t.id })}
                style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', padding:'12px 14px', minHeight:'52px', background:active?'var(--surface-raised)':'var(--surface)', border:`1px solid ${active?'var(--teal-bright)':'var(--border-color)'}`, borderRadius:'4px', cursor:'pointer', gap:'4px', touchAction:'manipulation' }}>
                <span style={{ fontFamily:'var(--mono-font)', fontSize:'11px', color:active?'var(--teal-bright)':'var(--vellum-dim)' }}>{t.label}</span>
                {active && <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)' }}>{t.hint}</span>}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
const head: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--vellum-dim)', margin:0 }
const hint: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-faint)', marginTop:'8px', lineHeight:1.5 }
