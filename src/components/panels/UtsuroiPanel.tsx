import { useState, useMemo } from 'react'
import type { IntegrityState } from '@/lib/integrity'
import { INTEGRITY_STATES } from '@/lib/integrity'
import { UTSUROI_MODULES, TOBIRA_REGISTRY, computeCouplingMatrix } from '@/lib/tripwires'
import { PROJECTS } from '@/data/projects'
import type { DirectiveState } from '@/lib/types'
import type { AuditTrail } from '@/lib/audit'
type ActiveCell = { row:number; col:number; score:number } | null
type Props = { state: DirectiveState; integrityState: IntegrityState; firedTobiraIds: string[]; auditTrail: AuditTrail }

export function UtsuroiPanel({ state, integrityState, firedTobiraIds, auditTrail }: Props) {
  const [hovered, setHovered] = useState<ActiveCell>(null)
  const [selected, setSelected] = useState<ActiveCell>(null)
  const matrix = useMemo(() => computeCouplingMatrix(), [])
  const displayTrail = useMemo(
    () => [...auditTrail.entries].slice(-30).reverse(),
    [auditTrail.entries]
  )
  const active = selected ?? hovered
  const integrity = INTEGRITY_STATES[integrityState]

  // Active project tesserae
  const activeProjects = PROJECTS.filter(p => state.activeProjectIds.includes(p.id))
  const allTesserae = activeProjects.flatMap(p => p.tesserae ?? [])

  function cellStyle(score: number, row: number, col: number): React.CSSProperties {
    const isActive = active?.row===row && active?.col===col
    const rFired = firedTobiraIds.some(id => UTSUROI_MODULES[row]?.tobiraIds.includes(id))
    const cFired = firedTobiraIds.some(id => UTSUROI_MODULES[col]?.tobiraIds.includes(id))
    if (score === 1) return { background:rFired?integrity.color:'rgba(77,184,196,0.7)', border:isActive?`1px solid ${integrity.color}`:'1px solid rgba(255,255,255,0.04)' }
    const hue = rFired&&cFired?330:rFired||cFired?45:185
    return { background:`hsla(${hue},80%,45%,${Math.min(Math.max(0.04,score*(rFired&&cFired?1.2:1)),0.95)})`, border:isActive?`1px solid ${integrity.color}`:'1px solid rgba(255,255,255,0.04)' }
  }

  const interpret = (s: number) => s>=0.6 ? 'High co-compromise risk. These modules share vocabulary and can be triggered by the same adversarial pattern.' : s>=0.3 ? 'Moderate overlap. Co-firing is possible under sophisticated input.' : 'Low coupling. Orthogonal detection domains. Independent failure modes.'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      {/* State banner */}
      <div style={{ padding:'14px 16px', background:integrity.colorDim, border:`1px solid ${integrity.color}`, borderRadius:'4px', display:'flex', alignItems:'center', gap:'16px' }}>
        <span style={{ fontSize:'28px', lineHeight:1, fontFamily:'serif', color:integrity.color }}>{integrity.glyph}</span>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'3px' }}>
            <span style={{ fontFamily:'var(--mono-font)', fontSize:'13px', color:integrity.color, letterSpacing:'0.1em' }}>{integrity.label}</span>
            {firedTobiraIds.length > 0 && <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:integrity.color, border:`1px solid ${integrity.color}`, borderRadius:'2px', padding:'1px 5px' }}>{firedTobiraIds.length} TOBIRA FIRED</span>}
          </div>
          <span style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-dim)' }}>{integrity.description}</span>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          {(['allowsExtraction','allowsApiCalls','allowsStateWrites'] as const).map(c => (
            <div key={c} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' }}>
              <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:integrity[c]?'#4db8c4':'#c85080' }}>{integrity[c]?'✓':'✗'}</span>
              <span style={{ fontFamily:'var(--mono-font)', fontSize:'7px', color:'var(--vellum-faint)', whiteSpace:'nowrap' }}>{c.replace('allows','')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Coupling matrix + detail */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 240px', gap:'12px' }}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'4px', padding:'14px', overflowX:'auto' }}>
          <p style={sHead}>COUPLING MATRIX — TOBIRA resonance · Jaccard vocabulary overlap</p>
          <div style={{ minWidth:'max-content', marginTop:'10px' }}>
            <div style={{ display:'flex', marginLeft:'84px', marginBottom:'4px' }}>
              {UTSUROI_MODULES.map((mod,i) => (
                <div key={i} style={{ width:'32px', display:'flex', justifyContent:'center' }}>
                  <span style={{ display:'block', transform:'rotate(-45deg) translateY(8px)', fontFamily:'var(--mono-font)', fontSize:'8px', color:firedTobiraIds.some(id=>mod.tobiraIds.includes(id))?integrity.color:'var(--vellum-faint)', whiteSpace:'nowrap', transformOrigin:'bottom left' }}>{mod.nameGlyph} {mod.name.slice(0,6)}</span>
                </div>
              ))}
            </div>
            {UTSUROI_MODULES.map((rowMod,i) => {
              const rFired = firedTobiraIds.some(id => rowMod.tobiraIds.includes(id))
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', marginTop:'3px' }}>
                  <div style={{ width:'84px', textAlign:'right', paddingRight:'8px', fontFamily:'var(--mono-font)', fontSize:'8px', color:rFired?integrity.color:'var(--vellum-faint)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{rowMod.nameGlyph} {rowMod.name}</div>
                  <div style={{ display:'flex', gap:'3px' }}>
                    {matrix[i].map((score,j) => (
                      <div key={j} style={{ width:'29px', height:'29px', borderRadius:'2px', cursor:'crosshair', transition:'all 0.15s', position:'relative', ...cellStyle(score,i,j) }}
                        onMouseEnter={() => setHovered({row:i,col:j,score})}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => setSelected(prev => prev?.row===i&&prev?.col===j?null:{row:i,col:j,score})}>
                        {hovered?.row===i&&hovered?.col===j && (
                          <div style={{ position:'absolute', bottom:'100%', left:'50%', transform:'translateX(-50%)', marginBottom:'4px', background:'var(--surface-raised)', border:'1px solid var(--border-color)', borderRadius:'2px', padding:'3px 6px', fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum)', whiteSpace:'nowrap', zIndex:10, pointerEvents:'none' }}>{(score*100).toFixed(0)}%</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            <div style={{ marginTop:'10px', display:'flex', alignItems:'center', gap:'8px', justifyContent:'flex-end' }}>
              <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum-faint)' }}>orthogonal</span>
              <div style={{ width:'60px', height:'5px', background:'linear-gradient(to right,transparent,rgba(77,184,196,0.8))', borderRadius:'1px', border:'1px solid var(--border-color)' }} />
              <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum-faint)' }}>symbiotic</span>
            </div>
          </div>
        </div>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'4px', padding:'14px', display:'flex', flexDirection:'column', gap:'10px' }}>
          <p style={sHead}>NODE ANALYSIS</p>
          {!active ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', border:'1px dashed var(--border-color)', borderRadius:'3px', padding:'20px', textAlign:'center', gap:'8px' }}>
              <span style={{ fontSize:'20px', opacity:0.2 }}>歪</span>
              <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)', lineHeight:1.6 }}>Select a cell to analyze module coupling and co-compromise vectors.</span>
            </div>
          ) : (
            <>
              <div style={{ textAlign:'center', padding:'10px', background:'var(--surface-raised)', borderRadius:'3px' }}>
                <div style={{ fontFamily:'var(--mono-font)', fontSize:'22px', color:integrity.color, fontWeight:500 }}>{(active.score*100).toFixed(0)}%</div>
                <div style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum-faint)', letterSpacing:'0.1em', marginTop:'2px' }}>RESONANCE</div>
              </div>
              {[UTSUROI_MODULES[active.row], UTSUROI_MODULES[active.col]].map((mod,idx) => {
                const fired = firedTobiraIds.some(id => mod.tobiraIds.includes(id))
                return (
                  <div key={idx} style={{ padding:'8px 10px', background:'var(--cipher)', borderRadius:'3px', border:`1px solid ${fired?integrity.color:'var(--border-color)'}` }}>
                    <div style={{ fontFamily:'var(--mono-font)', fontSize:'7px', color:'var(--vellum-faint)', letterSpacing:'0.1em', marginBottom:'3px' }}>{active.row===active.col?'SELF':idx===0?'ALPHA':'BETA'}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <span style={{ fontSize:'14px', color:fired?integrity.color:'var(--vellum-dim)' }}>{mod.nameGlyph}</span>
                      <div>
                        <div style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:fired?integrity.color:'var(--vellum)' }}>{mod.name}</div>
                        <div style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum-faint)' }}>{mod.category}</div>
                      </div>
                      {fired && <span style={{ marginLeft:'auto', fontFamily:'var(--mono-font)', fontSize:'7px', color:integrity.color, border:`1px solid ${integrity.color}`, borderRadius:'2px', padding:'1px 4px' }}>ACTIVE</span>}
                    </div>
                  </div>
                )
              })}
              <div style={{ padding:'10px', background:'var(--cipher)', borderRadius:'3px', border:'1px solid var(--border-color)' }}>
                <p style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-dim)', lineHeight:1.6, margin:0 }}>
                  {active.row===active.col ? UTSUROI_MODULES[active.row].description : interpret(active.score)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* TESSERA panel — unjoined implementations */}
      {allTesserae.length > 0 && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'4px', padding:'14px' }}>
          <p style={{ ...sHead, marginBottom:'10px' }}>TESSERA — {allTesserae.length} unjoined implementation{allTesserae.length!==1?'s':''}</p>
          <p style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)', lineHeight:1.6, marginBottom:'12px' }}>
            Each tessera compiles and exports correctly. The wiring to the live system is dormant. Neither half of the bond has been joined yet.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {allTesserae.map(t => (
              <div key={t.id} style={{ padding:'10px 12px', background:'var(--cipher)', borderRadius:'3px', border:'1px solid var(--border-color)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
                  <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--gold)', border:'1px solid var(--gold)', borderRadius:'2px', padding:'1px 5px', flexShrink:0, marginTop:'1px' }}>Group {t.group}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum)', marginBottom:'3px' }}>{t.module}</div>
                    <div style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)' }}>↔ {t.missingHalf}</div>
                    {t.blockedBy && <div style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--coral)', marginTop:'3px' }}>blocked: {t.blockedBy}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOBIRA registry */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'4px', padding:'14px' }}>
        <p style={{ ...sHead, marginBottom:'12px' }}>TOBIRA REGISTRY — {TOBIRA_REGISTRY.length} gates · {firedTobiraIds.length} fired this session</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'5px' }}>
          {TOBIRA_REGISTRY.map(t => {
            const fired = firedTobiraIds.includes(t.id)
            return (
              <div key={t.id} style={{ display:'flex', alignItems:'flex-start', gap:'8px', padding:'8px 10px', background:fired?integrity.colorDim:'var(--cipher)', border:`1px solid ${fired?integrity.color:'var(--border-color)'}`, borderRadius:'3px' }}>
                <span style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:fired?integrity.color:'var(--vellum-faint)', flexShrink:0, marginTop:'1px' }}>{t.glyph}</span>
                <div>
                  <div style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:fired?integrity.color:'var(--vellum-faint)', letterSpacing:'0.06em' }}>{t.name}</div>
                  <div style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum-faint)', marginTop:'2px', lineHeight:1.4 }}>{t.description}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

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
    </div>
  )
}
const sHead: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'8px', letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--vellum-faint)', margin:0 }
