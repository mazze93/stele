import type { DirectiveState } from '@/lib/types'
const SNIPPETS = [
  { label:'No follow-ups',   text:'Do not offer follow-up suggestions unless I explicitly ask.' },
  { label:'Full audit',      text:'Always run the full ARCHITECTURE checklist even on small changes.' },
  { label:'Obsidian export', text:'At session end, generate an Obsidian-ready Markdown export with concept graph seeds.' },
  { label:'Box upload',      text:'At session close, batch-upload all artifacts to the appropriate Box folder for the active project.' },
  { label:'ARM only',        text:'All builds and Docker images must be ARM64-native. Refuse x86 without explicit justification.' },
]
type Props = { state: DirectiveState; onChange: (n: DirectiveState) => void }
export function AppendPanel({ state, onChange }: Props) {
  function insertSnippet(text: string) {
    const sep = state.customAppend.trim() ? '\n' : ''
    onChange({ ...state, customAppend: state.customAppend + sep + text })
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <section>
        <h3 style={head}>Custom Append</h3>
        <p style={{ ...hint, marginTop:'6px', marginBottom:'12px' }}>Appended verbatim to compiled output. Session-specific constraints, one-off overrides.</p>
        <textarea value={state.customAppend} onChange={e => onChange({ ...state, customAppend:e.target.value })}
          placeholder="Add session-specific instructions, overrides, or context..."
          style={{ background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'3px', color:'var(--vellum)', fontFamily:'var(--mono-font)', fontSize:'11px', padding:'10px 12px', width:'100%', minHeight:'140px', resize:'vertical', lineHeight:1.6 }} />
      </section>
      <section>
        <h3 style={{ ...head, marginBottom:'12px' }}>Quick inserts</h3>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
          {SNIPPETS.map(s => (
            <button key={s.label} onClick={() => insertSnippet(s.text)} title={s.text}
              style={{ padding:'6px 10px', background:'transparent', border:'1px solid var(--border-color)', borderRadius:'3px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-dim)', touchAction:'manipulation' }}>
              + {s.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
const head: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--vellum-dim)', margin:0 }
const hint: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-faint)', margin:0, lineHeight:1.6 }
