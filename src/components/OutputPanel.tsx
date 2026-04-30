import { useState, useEffect } from 'react'
import type { DirectiveState } from '@/lib/types'
import { compile, wordCount, charCount } from '@/lib/compiler'
import { PROJECTS, POSTURE_META } from '@/data/projects'
import { INTEGRITY_STATES } from '@/lib/integrity'
import type { IntegrityState } from '@/lib/integrity'

type Props = { state: DirectiveState; fullWidth?: boolean }

const TARGET_LEGEND: Record<string, { includes: string[]; excludes: string[] }> = {
  'claude-ai':         { includes:['POSTURE','integrity block','project table','hard stops (scoped)','escalation triggers (scoped)','output format','token hygiene','TESSERA (if any)','design language','open questions'], excludes:['machine config','full project registry','auto-enforce block','code standards'] },
  'claude-md-global':  { includes:['machine config','full project registry (all)','governance hard stops','auto-enforce rules','code standards','TESSERA (if any)','design language','escalation trigger table with scope','open questions'], excludes:['conversational POSTURE line','project-specific stack detail'] },
  'claude-md-project': { includes:['posture + description','narrative fields (AI-authored)','stack detail','compliance list','project hard stops only','project-scoped triggers','TESSERA (project only)','project open questions'], excludes:['machine config','universal rules','other projects','universal triggers'] },
}

export function OutputPanel({ state, fullWidth }: Props) {
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  useEffect(() => { setOutput(compile(state)) }, [state])

  async function copyToClipboard() {
    await navigator.clipboard.writeText(output)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  const integrity = INTEGRITY_STATES[state.integrityState as IntegrityState]
  const activeProjects = PROJECTS.filter(p => state.activeProjectIds.includes(p.id))
  const legend = TARGET_LEGEND[state.outputTarget]
  const isEpoché = state.integrityState === 'EPOCHÉ'

  const targetLabel = state.outputTarget === 'claude-ai' ? 'claude.ai instructions'
    : state.outputTarget === 'claude-md-global' ? 'CLAUDE.md global' : 'CLAUDE.md project'

  return (
    <div style={{ width:fullWidth?undefined:'400px', flex:fullWidth?1:undefined, flexShrink:0, display:'flex', flexDirection:'column', borderLeft:'1px solid var(--border-color)', minWidth:0, background:isEpoché?`${integrity.colorDim}`:undefined }}>
      <div style={{ padding:'12px 16px', borderBottom:`1px solid ${isEpoché?integrity.color:'var(--border-color)'}`, display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'var(--mono-font)', fontSize:'10px', letterSpacing:'0.12em', textTransform:'uppercase', color:isEpoché?integrity.color:'var(--vellum-dim)' }}>{targetLabel}</div>
          <div style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)', marginTop:'2px' }}>{wordCount(output)} words · {charCount(output)} chars</div>
        </div>
        {!isEpoché && (
          <button onClick={() => setShowLegend(v => !v)}
            style={{ padding:'5px 8px', background:showLegend?'var(--surface-raised)':'transparent', border:`1px solid ${showLegend?'var(--teal)':'var(--border-color)'}`, borderRadius:'3px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'9px', color:showLegend?'var(--teal-bright)':'var(--vellum-faint)', touchAction:'manipulation', whiteSpace:'nowrap' }}>
            {showLegend ? 'hide diff' : 'diff ↗'}
          </button>
        )}
        <button onClick={copyToClipboard}
          style={{ padding:'7px 14px', minHeight:'36px', background:copied?'var(--teal)':'var(--surface-raised)', border:`1px solid ${copied?'var(--teal)':'var(--border-color)'}`, borderRadius:'3px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'11px', color:copied?'var(--vellum)':'var(--vellum-dim)', transition:'all 0.15s', flexShrink:0, touchAction:'manipulation' }}>
          {copied ? '✓ copied' : 'Copy'}
        </button>
      </div>
      {showLegend && legend && !isEpoché && (
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border-color)', background:'var(--surface)', display:'flex', gap:'16px', flexWrap:'wrap' }}>
          {[{title:'✓ Includes', items:legend.includes, color:'var(--teal-bright)'},{title:'✗ Excludes', items:legend.excludes, color:'var(--coral)'}].map(col => (
            <div key={col.title} style={{ flex:1, minWidth:'140px' }}>
              <p style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:col.color, letterSpacing:'0.08em', marginBottom:'6px' }}>{col.title}</p>
              {col.items.map(item => <span key={item} style={{ display:'block', fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)', lineHeight:1.5 }}>{item}</span>)}
            </div>
          ))}
        </div>
      )}
      {activeProjects.length > 0 && !isEpoché && (
        <div style={{ display:'flex', gap:'8px', padding:'8px 16px', borderBottom:'1px solid var(--border-color)', flexWrap:'wrap' }}>
          {activeProjects.map(p => {
            const meta = POSTURE_META[p.posture]
            return (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:meta.color }} />
                <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)' }}>{p.scope} · {p.posture}</span>
              </div>
            )
          })}
        </div>
      )}
      <pre style={{ flex:1, overflowY:'auto', margin:0, padding:'16px', fontFamily:'var(--mono-font)', fontSize:'10.5px', lineHeight:1.7, color:isEpoché?integrity.color:'var(--vellum)', whiteSpace:'pre-wrap', wordBreak:'break-word', background:'transparent' }}>
        {output || <span style={{ color:'var(--vellum-faint)', fontStyle:'italic' }}>
          {'// No project selected — universal output only.\n// Select a project to load compliance rules,\n// hard stops, and project-scoped TOBIRA triggers.'}
        </span>}
      </pre>
    </div>
  )
}
