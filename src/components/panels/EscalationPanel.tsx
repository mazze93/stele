import type { DirectiveState } from '@/lib/types'
import { PROJECTS } from '@/data/projects'
import { activeTriggersForProjects } from '@/data/defaults'
const UNIVERSAL_STOPS = ['rm -rf on non-temp paths','git commit/push/merge/rebase (never autonomous)','Secrets written to any file','Wildcard CORS in production','innerHTML with untrusted input']
type Props = { state: DirectiveState; onChange: (n: DirectiveState) => void }
export function EscalationPanel({ state, onChange }: Props) {
  function toggleTrigger(id: string) {
    onChange({ ...state, escalationTriggers: state.escalationTriggers.map(e => e.id === id && !e.locked ? { ...e, enabled:!e.enabled } : e) })
  }
  const activeProjects = PROJECTS.filter(p => state.activeProjectIds.includes(p.id))
  const projectStops = [...new Set(activeProjects.flatMap(p => p.hardStops))]
  const universalTriggers = state.escalationTriggers.filter(e => e.scope === 'universal')
  const projectTriggers = state.escalationTriggers.filter(e => e.scope === 'project')
  const visibleProjectTriggers = projectTriggers.filter(e => e.projectIds?.some(id => state.activeProjectIds.includes(id)))
  const dormantCount = projectTriggers.filter(e => !e.projectIds?.some(id => state.activeProjectIds.includes(id))).length
  const activeTriggerCount = activeTriggersForProjects(state.escalationTriggers, state.activeProjectIds).length
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'28px' }}>
      <div style={{ display:'flex', gap:'16px', padding:'10px 12px', background:'var(--surface)', borderRadius:'3px', border:'1px solid var(--border-color)', flexWrap:'wrap' }}>
        {[{l:'Active',v:String(activeTriggerCount),c:'var(--teal-bright)'},{l:'Universal',v:String(universalTriggers.filter(e=>e.enabled).length),c:'var(--vellum-dim)'},{l:'Project',v:String(visibleProjectTriggers.filter(e=>e.enabled).length),c:activeProjects.length>0?'var(--gold)':'var(--vellum-faint)'}].map(s => (
          <div key={s.l} style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
            <span style={{ fontFamily:'var(--mono-font)', fontSize:'14px', color:s.c, fontWeight:500 }}>{s.v}</span>
            <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)' }}>{s.l}</span>
          </div>
        ))}
        {activeProjects.length === 0 && <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)', alignSelf:'center' }}>select a project to load project-scoped triggers</span>}
      </div>
      <section>
        <h3 style={head}>Universal Triggers <Tag label="all projects" color="var(--vellum-faint)" /></h3>
        <div style={{ display:'flex', flexDirection:'column', gap:'5px', marginTop:'12px' }}>
          {universalTriggers.map(e => <TriggerRow key={e.id} trigger={e} onToggle={() => toggleTrigger(e.id)} />)}
        </div>
      </section>
      {visibleProjectTriggers.length > 0 && (
        <section>
          <h3 style={head}>Project Triggers <Tag label={activeProjects.map(p=>p.scope).join(' + ')} color="var(--gold)" /></h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'5px', marginTop:'12px' }}>
            {visibleProjectTriggers.map(e => <TriggerRow key={e.id} trigger={e} onToggle={() => toggleTrigger(e.id)} />)}
          </div>
        </section>
      )}
      {dormantCount > 0 && <p style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-faint)' }}>{dormantCount} trigger{dormantCount!==1?'s':''} dormant — select project to activate</p>}
      <section>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
          <h3 style={head}>Hard Stops</h3>
          <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'rgba(192,57,43,0.8)', letterSpacing:'0.08em' }}>READ ONLY</span>
        </div>
        <p style={hint}>Universal:</p>
        <div style={{ display:'flex', flexDirection:'column', gap:'3px', margin:'6px 0 14px' }}>
          {UNIVERSAL_STOPS.map(s => <StopRow key={s} text={s} />)}
        </div>
        {projectStops.length > 0 && <>
          <p style={hint}>{activeProjects.map(p=>p.scope).join(' + ')} specific:</p>
          <div style={{ display:'flex', flexDirection:'column', gap:'3px', marginTop:'6px' }}>
            {projectStops.map(s => <StopRow key={s} text={s} dimmer />)}
          </div>
        </>}
      </section>
    </div>
  )
}
function TriggerRow({ trigger, onToggle }: { trigger: { id:string; label:string; locked:boolean; enabled:boolean; projectIds?:string[] }; onToggle:()=>void }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'10px 12px', minHeight:'44px', background:trigger.enabled?'var(--surface-raised)':'var(--surface)', border:`1px solid ${trigger.locked?'rgba(192,57,43,0.25)':trigger.enabled?'var(--border-color)':'transparent'}`, borderRadius:'3px', opacity:trigger.enabled?1:0.45 }}>
      <div style={{ flex:1 }}>
        <span style={{ fontFamily:'var(--mono-font)', fontSize:'11px', color:trigger.locked?'var(--coral)':'var(--vellum)', lineHeight:1.5 }}>{trigger.label}</span>
        <div style={{ display:'flex', gap:'6px', marginTop:'3px' }}>
          {trigger.locked && <Tag label="LOCKED" color="var(--coral)" />}
        </div>
      </div>
      <button onClick={onToggle} disabled={trigger.locked} aria-pressed={trigger.enabled}
        style={{ width:'36px', height:'22px', minWidth:'36px', flexShrink:0, background:trigger.enabled?(trigger.locked?'rgba(192,57,43,0.6)':'var(--teal)'):'var(--surface)', border:`1px solid ${trigger.enabled?(trigger.locked?'rgba(192,57,43,0.8)':'var(--teal)'):'var(--border-color)'}`, borderRadius:'11px', cursor:trigger.locked?'not-allowed':'pointer', position:'relative', transition:'all 0.15s', padding:0, touchAction:'manipulation' }}>
        <span style={{ position:'absolute', top:'3px', left:trigger.enabled?'16px':'3px', width:'14px', height:'14px', borderRadius:'50%', background:'var(--vellum)', transition:'left 0.15s' }} />
      </button>
    </div>
  )
}
function StopRow({ text, dimmer }: { text:string; dimmer?:boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:'8px', padding:'5px 8px', background:'rgba(192,57,43,0.05)', borderRadius:'2px' }}>
      <span style={{ color:dimmer?'rgba(192,57,43,0.35)':'rgba(192,57,43,0.55)', fontSize:'10px', flexShrink:0 }}>■</span>
      <span style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-dim)', lineHeight:1.5 }}>{text}</span>
    </div>
  )
}
function Tag({ label, color }: { label:string; color:string }) {
  return <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color, border:`1px solid ${color}`, borderRadius:'2px', padding:'1px 5px', letterSpacing:'0.06em', opacity:0.85, whiteSpace:'nowrap' }}>{label}</span>
}
const head: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--vellum-dim)', margin:0, display:'flex', alignItems:'center', gap:'8px' }
const hint: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-faint)', margin:0, lineHeight:1.6 }
