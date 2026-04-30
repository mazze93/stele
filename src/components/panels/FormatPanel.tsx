import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DirectiveState, Verbosity, OutputSection, HygieneTrigger } from '@/lib/types'
import { useIsMobile } from '@/hooks/useIsMobile'
const VERBOSITY: { id: Verbosity; label: string; hint: string }[] = [
  { id:'dense',    label:'Dense',    hint:'Code first. Skip passing audit. No ceremony.' },
  { id:'standard', label:'Standard', hint:'Default — balanced output for most sessions.' },
  { id:'expanded', label:'Expanded', hint:'Full rationale. All audit findings. Complete derivations.' },
]
const HYGIENE: { id: HygieneTrigger; label: string; hint: string }[] = [
  { id:'off',        label:'Off',        hint:'No session hygiene instructions compiled.' },
  { id:'on-copy',    label:'On export',  hint:'Triggered when you request a copy/export.' },
  { id:'turn-based', label:'Turn-based', hint:'Remind at turn 2, export after N turns.' },
  { id:'manual',     label:'Manual',     hint:'Only when explicitly requested.' },
]
type Props = { state: DirectiveState; onChange: (n: DirectiveState) => void }
export function FormatPanel({ state, onChange }: Props) {
  const isMobile = useIsMobile()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint:{ distance:6 } }),
    useSensor(TouchSensor,   { activationConstraint:{ delay:250, tolerance:8 } }),
  )
  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e; if (!over || active.id === over.id) return
    const oi = state.outputSections.findIndex(s => s.id === active.id)
    const ni = state.outputSections.findIndex(s => s.id === over.id)
    onChange({ ...state, outputSections:arrayMove(state.outputSections, oi, ni) })
  }
  function toggleSection(id: string) {
    onChange({ ...state, outputSections:state.outputSections.map(s => s.id===id?{...s,enabled:!s.enabled}:s) })
  }
  function moveSection(i: number, dir: -1|1) {
    const secs = [...state.outputSections]; const t = i + dir
    if (t < 0 || t >= secs.length) return
    ;[secs[i], secs[t]] = [secs[t], secs[i]]
    onChange({ ...state, outputSections:secs })
  }
  const enabledCount = state.outputSections.filter(s => s.enabled).length
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'28px' }}>
      <section>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
          <h3 style={head}>Output Sections</h3>
          <span style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-faint)' }}>{enabledCount}/{state.outputSections.length}</span>
        </div>
        <p style={{ ...hint, marginBottom:'14px' }}>{isMobile ? 'Tap arrows to reorder.' : 'Drag to reorder.'} Toggle to include or omit.</p>
        {isMobile ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
            {state.outputSections.map((s,i) => (
              <MobileRow key={s.id} section={s} index={i} total={state.outputSections.length}
                onToggle={() => toggleSection(s.id)} onMoveUp={() => moveSection(i,-1)} onMoveDown={() => moveSection(i,1)} />
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={state.outputSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                {state.outputSections.map((s,i) => <SortableRow key={s.id} section={s} index={i} onToggle={() => toggleSection(s.id)} />)}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>
      <section>
        <h3 style={{ ...head, marginBottom:'14px' }}>Verbosity</h3>
        <div style={{ display:'flex', gap:'8px' }}>
          {VERBOSITY.map(v => {
            const active = state.verbosity === v.id
            return <button key={v.id} onClick={() => onChange({...state,verbosity:v.id})} title={v.hint}
              style={{ flex:1, padding:'10px 6px', minHeight:'44px', background:active?'var(--surface-raised)':'transparent', border:`1px solid ${active?'var(--teal)':'var(--border-color)'}`, borderRadius:'3px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'11px', color:active?'var(--teal-bright)':'var(--vellum-dim)', transition:'all 0.12s', touchAction:'manipulation' }}>{v.label}</button>
          })}
        </div>
        <p style={{ ...hint, marginTop:'8px' }}>{VERBOSITY.find(v => v.id===state.verbosity)?.hint}</p>
      </section>
      <section>
        <h3 style={{ ...head, marginBottom:'6px' }}>Session Hygiene</h3>
        <p style={{ ...hint, marginBottom:'14px' }}>Controls when Claude is instructed to prompt for transcript export.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
          {HYGIENE.map(h => {
            const active = state.hygieneTrigger === h.id
            return <button key={h.id} onClick={() => onChange({...state,hygieneTrigger:h.id})}
              style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', minHeight:'44px', background:active?'var(--surface-raised)':'transparent', border:`1px solid ${active?'var(--teal)':'transparent'}`, borderRadius:'3px', cursor:'pointer', textAlign:'left', touchAction:'manipulation', width:'100%' }}>
              <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:active?'var(--teal-bright)':'var(--border-color)', flexShrink:0, transition:'background 0.12s' }} />
              <div style={{ flex:1 }}>
                <span style={{ fontFamily:'var(--mono-font)', fontSize:'11px', color:active?'var(--vellum)':'var(--vellum-dim)', display:'block' }}>{h.label}</span>
                {active && <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)', display:'block', marginTop:'2px' }}>{h.hint}</span>}
              </div>
            </button>
          })}
        </div>
        {state.hygieneTrigger === 'turn-based' && (
          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginTop:'12px', padding:'10px 12px', background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'3px' }}>
            <span style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-dim)', whiteSpace:'nowrap' }}>Export after turn</span>
            <input type="number" min={3} max={50} value={state.hygieneAfterN}
              onChange={e => onChange({...state,hygieneAfterN:Math.max(3,Math.min(50,Number(e.target.value)))})}
              style={{ width:'64px', padding:'6px 8px', background:'var(--surface-raised)', border:'1px solid var(--border-color)', borderRadius:'3px', color:'var(--vellum)', fontFamily:'var(--mono-font)', fontSize:'12px', textAlign:'center' }} />
          </div>
        )}
      </section>
    </div>
  )
}
function SortableRow({ section, index, onToggle }: { section: OutputSection; index: number; onToggle: ()=>void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id:section.id })
  return (
    <div ref={setNodeRef} style={{ transform:CSS.Transform.toString(transform), transition, zIndex:isDragging?10:undefined }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px', minHeight:'44px', background:isDragging||section.enabled?'var(--surface-raised)':'var(--surface)', border:`1px solid ${isDragging?'var(--teal)':section.enabled?'var(--border-color)':'transparent'}`, borderRadius:'3px', opacity:section.enabled?1:0.45, boxShadow:isDragging?'0 4px 16px rgba(0,0,0,0.4)':'none' }}>
        <button {...attributes} {...listeners} style={{ background:'none', border:'none', padding:'4px 2px', cursor:isDragging?'grabbing':'grab', color:'var(--vellum-faint)', flexShrink:0, touchAction:'none', display:'flex' }} aria-label="Drag to reorder">
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" style={{ opacity:0.5 }}><circle cx="2.5" cy="2.5" r="1.5"/><circle cx="7.5" cy="2.5" r="1.5"/><circle cx="2.5" cy="7" r="1.5"/><circle cx="7.5" cy="7" r="1.5"/><circle cx="2.5" cy="11.5" r="1.5"/><circle cx="7.5" cy="11.5" r="1.5"/></svg>
        </button>
        <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)', width:'16px', textAlign:'right', flexShrink:0 }}>{section.enabled?String(index+1).padStart(2,'0'):'—'}</span>
        <span style={{ flex:1, fontFamily:'var(--mono-font)', fontSize:'11px', color:section.enabled?'var(--vellum)':'var(--vellum-dim)' }}>{section.label}</span>
        <Toggle enabled={section.enabled} onToggle={onToggle} />
      </div>
    </div>
  )
}
function MobileRow({ section, index, total, onToggle, onMoveUp, onMoveDown }: { section:OutputSection; index:number; total:number; onToggle:()=>void; onMoveUp:()=>void; onMoveDown:()=>void }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px', minHeight:'52px', background:section.enabled?'var(--surface-raised)':'var(--surface)', border:`1px solid ${section.enabled?'var(--border-color)':'transparent'}`, borderRadius:'3px', opacity:section.enabled?1:0.45 }}>
      <div style={{ display:'flex', flexDirection:'column', gap:'2px', flexShrink:0 }}>
        <button onClick={onMoveUp} disabled={index===0} style={tapBtnStyle}>↑</button>
        <button onClick={onMoveDown} disabled={index===total-1} style={tapBtnStyle}>↓</button>
      </div>
      <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)', width:'14px', textAlign:'right', flexShrink:0 }}>{section.enabled?String(index+1).padStart(2,'0'):'—'}</span>
      <span style={{ flex:1, fontFamily:'var(--mono-font)', fontSize:'11px', color:section.enabled?'var(--vellum)':'var(--vellum-dim)' }}>{section.label}</span>
      <Toggle enabled={section.enabled} onToggle={onToggle} />
    </div>
  )
}
function Toggle({ enabled, onToggle }: { enabled:boolean; onToggle:()=>void }) {
  return (
    <button onClick={onToggle} aria-pressed={enabled}
      style={{ width:'36px', height:'22px', minWidth:'36px', flexShrink:0, background:enabled?'var(--teal)':'var(--surface)', border:`1px solid ${enabled?'var(--teal)':'var(--border-color)'}`, borderRadius:'11px', cursor:'pointer', position:'relative', transition:'all 0.15s', padding:0, touchAction:'manipulation' }}>
      <span style={{ position:'absolute', top:'3px', left:enabled?'16px':'3px', width:'14px', height:'14px', borderRadius:'50%', background:'var(--vellum)', transition:'left 0.15s' }} />
    </button>
  )
}
const tapBtnStyle: React.CSSProperties = { width:'28px', height:'22px', background:'transparent', border:'1px solid var(--border-color)', borderRadius:'2px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-dim)', padding:0, touchAction:'manipulation', display:'flex', alignItems:'center', justifyContent:'center' }
const head: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--vellum-dim)', margin:0 }
const hint: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-faint)', margin:0, lineHeight:1.6 }
