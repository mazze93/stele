import { THEMES, THEME_MAP } from '@/data/themes'
import type { ThemeId } from '@/data/themes'
type Props = { activeThemeId: ThemeId; onChange: (id: ThemeId) => void }
export function ThemePanel({ activeThemeId, onChange }: Props) {
  const activeTheme = THEME_MAP[activeThemeId]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'28px' }}>
      <section>
        <h3 style={head}>Themes</h3>
        <p style={{ ...hint, marginTop:'6px', marginBottom:'20px' }}>Each theme maps to a project register. Swaps live — fonts load async after paint.</p>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {THEMES.map(theme => {
            const active = theme.id === activeThemeId
            const bg = theme.vars['--cipher']; const surf = theme.vars['--surface-raised']
            const teal = theme.vars['--teal-bright']; const gold = theme.vars['--gold-bright'] ?? theme.vars['--gold']
            const coral = theme.vars['--coral']; const text = theme.vars['--vellum']
            return (
              <button key={theme.id} onClick={() => onChange(theme.id)}
                style={{ display:'flex', gap:'16px', alignItems:'center', padding:'14px 16px', background:active?surf:'transparent', border:`1px solid ${active?teal:'var(--border-color)'}`, borderRadius:'4px', cursor:'pointer', textAlign:'left', touchAction:'manipulation', transition:'all 0.15s', width:'100%' }}>
                <div style={{ flexShrink:0, width:'72px', height:'52px', background:bg, borderRadius:'3px', overflow:'hidden', position:'relative', border:active?`1.5px solid ${teal}`:'1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'18px', background:surf }} />
                  <div style={{ position:'absolute', bottom:'5px', left:'6px', display:'flex', gap:'4px' }}>
                    {[teal,gold,coral].map(c => <div key={c} style={{ width:'7px', height:'7px', borderRadius:'50%', background:c }} />)}
                  </div>
                  <div style={{ position:'absolute', top:'8px', left:'7px', right:'7px' }}>
                    <div style={{ height:'2px', background:text, opacity:0.7, marginBottom:'3px', width:'80%' }} />
                    <div style={{ height:'1.5px', background:text, opacity:0.35, width:'60%' }} />
                  </div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:'8px', flexWrap:'wrap', marginBottom:'4px' }}>
                    <span style={{ fontFamily:theme.fonts.headingFamily, fontSize:'14px', color:active?'var(--vellum)':'var(--vellum-dim)', fontWeight:500 }}>{theme.label}</span>
                    {active && <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:teal, border:`1px solid ${teal}`, borderRadius:'2px', padding:'1px 5px' }}>ACTIVE</span>}
                  </div>
                  <p style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-faint)', margin:'0 0 6px', lineHeight:1.5 }}>{theme.description}</p>
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                    {theme.moodTags.map(tag => <span key={tag} style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum-faint)', border:'1px solid var(--border-color)', borderRadius:'2px', padding:'1px 5px' }}>{tag}</span>)}
                    {theme.projectHint && <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:gold, border:`1px solid ${gold}`, borderRadius:'2px', padding:'1px 5px', opacity:0.8 }}>↳ {theme.projectHint}</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>
      <section>
        <h3 style={{ ...head, marginBottom:'16px' }}>Font Preview</h3>
        <div style={{ padding:'16px', background:'var(--surface)', borderRadius:'4px', border:'1px solid var(--border-color)', display:'flex', flexDirection:'column', gap:'14px' }}>
          <div>
            <p style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum-faint)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px' }}>Heading</p>
            <p style={{ fontFamily:activeTheme.fonts.headingFamily, fontSize:'20px', color:'var(--vellum)', lineHeight:1.2, margin:0 }}>The Signal &amp; Cost</p>
            <p style={{ fontFamily:activeTheme.fonts.headingFamily, fontSize:'13px', fontStyle:'italic', color:'var(--vellum-dim)', margin:'4px 0 0' }}>Latent structure in the noise</p>
          </div>
          <div style={{ height:'1px', background:'var(--border-color)' }} />
          <div>
            <p style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum-faint)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'6px' }}>Monospace</p>
            <pre style={{ fontFamily:activeTheme.fonts.monoFamily, fontSize:'11px', color:'var(--teal-bright)', margin:0, lineHeight:1.6 }}>
              {'[DR] wire escalate() → integrityState\n[SP] add SOGI mask to cert audit output'}
            </pre>
          </div>
        </div>
      </section>
    </div>
  )
}
const head: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--vellum-dim)', margin:0 }
const hint: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-faint)', margin:0, lineHeight:1.6 }
