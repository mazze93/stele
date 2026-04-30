import { useState } from 'react'
import type { DirectiveState, OpenQuestion } from '@/lib/types'
import { PROJECTS } from '@/data/projects'
type Props = { state: DirectiveState; onChange: (n: DirectiveState) => void }
export function QuestionsPanel({ state, onChange }: Props) {
  const [newText, setNewText] = useState('')
  const [newProjectId, setNewProjectId] = useState(state.activeProjectIds[0] ?? '')
  function addQuestion() {
    const text = newText.trim(); if (!text) return
    onChange({ ...state, openQuestions: [...state.openQuestions, { id:`q-${Date.now()}`, projectId:newProjectId, text }] })
    setNewText('')
  }
  function removeQuestion(id: string) { onChange({ ...state, openQuestions: state.openQuestions.filter(q => q.id !== id) }) }
  function seedDefaults() {
    const existing = new Set(state.openQuestions.map(q => q.text))
    const newQs: OpenQuestion[] = PROJECTS.filter(p => state.activeProjectIds.includes(p.id))
      .flatMap(p => p.openQuestions.filter(t => !existing.has(t)).map(t => ({ id:`q-${Date.now()}-${Math.random()}`, projectId:p.id, text:t })))
    if (newQs.length > 0) onChange({ ...state, openQuestions: [...state.openQuestions, ...newQs] })
  }
  const hasDefaults = PROJECTS.filter(p => state.activeProjectIds.includes(p.id)).some(p => p.openQuestions.length > 0)
  const grouped = PROJECTS.map(p => ({ project:p, questions:state.openQuestions.filter(q => q.projectId === p.id) })).filter(g => g.questions.length > 0)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>
      <section>
        <h3 style={head}>Open Questions</h3>
        <p style={{ ...hint, marginBottom:'12px', marginTop:'6px' }}>Pinned across sessions. Compiled into every output target.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)}
            style={{ background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'3px', color:'var(--vellum)', fontFamily:'var(--mono-font)', fontSize:'11px', padding:'8px 10px' }}>
            <option value="">— no project —</option>
            {PROJECTS.map(p => <option key={p.id} value={p.id}>[{p.scope}] {p.label}</option>)}
          </select>
          <textarea value={newText} onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addQuestion() }}
            placeholder="Describe the open question or unresolved design point..."
            style={{ background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'3px', color:'var(--vellum)', fontFamily:'var(--mono-font)', fontSize:'11px', padding:'8px 10px', minHeight:'72px', resize:'vertical', lineHeight:1.5 }} />
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={addQuestion} disabled={!newText.trim()}
              style={{ flex:1, padding:'8px 12px', background:'var(--teal)', border:'none', borderRadius:'3px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'11px', color:'var(--vellum)', touchAction:'manipulation' }}>
              Add ⌘↵
            </button>
            {hasDefaults && (
              <button onClick={seedDefaults}
                style={{ flex:1, padding:'8px 12px', background:'transparent', border:'1px solid var(--border-color)', borderRadius:'3px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'11px', color:'var(--vellum-dim)', touchAction:'manipulation' }}>
                Seed from project defaults
              </button>
            )}
          </div>
        </div>
      </section>
      {grouped.length > 0 && (
        <section>
          {grouped.map(({ project:p, questions }) => (
            <div key={p.id} style={{ marginBottom:'16px' }}>
              <p style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px' }}>[{p.scope}] {p.label}</p>
              {questions.map(q => (
                <div key={q.id} style={{ display:'flex', gap:'8px', padding:'8px 10px', background:'var(--surface-raised)', borderRadius:'3px', border:'1px solid var(--border-color)', marginBottom:'4px' }}>
                  <p style={{ flex:1, fontFamily:'var(--mono-font)', fontSize:'11px', color:'var(--vellum)', lineHeight:1.5, margin:0 }}>{q.text}</p>
                  <button onClick={() => removeQuestion(q.id)}
                    style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--vellum-faint)', fontFamily:'var(--mono-font)', fontSize:'12px', padding:'0 2px', alignSelf:'flex-start', lineHeight:1 }}>×</button>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
const head: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--vellum-dim)', margin:0 }
const hint: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-faint)', margin:0, lineHeight:1.6 }
