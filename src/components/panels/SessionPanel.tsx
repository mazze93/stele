import type { DirectiveState } from '@/lib/types'
import type { AuditTrail } from '@/lib/audit'
import { INTEGRITY_STATES } from '@/lib/integrity'
import { TOBIRA_REGISTRY } from '@/lib/tripwires'
import { PROJECTS } from '@/data/projects'
import { activeTriggersForProjects } from '@/data/defaults'
import { findMode } from '@/data/modes'
import { STELE_VERSION } from '@/lib/version'
import { AuditControls } from '../AuditControls'

type Props = { state: DirectiveState; auditTrail: AuditTrail; onNavigate: (tab: 'format' | 'modes' | 'utsuroi' | 'inherit') => void }
export function SessionPanel({ state, auditTrail, onNavigate }: Props) {
  const integrity = INTEGRITY_STATES[state.integrityState]
  const projects = PROJECTS.filter(project => state.activeProjectIds.includes(project.id))
  const triggers = activeTriggersForProjects(state.escalationTriggers, state.activeProjectIds)
  const capabilities = [
    ['Extraction', integrity.allowsExtraction], ['API calls', integrity.allowsApiCalls],
    ['State writes', integrity.allowsStateWrites], ['Patch application', integrity.allowsPatchApplication],
  ] as const
  return <div className="workspace-page">
    <div className="workspace-intro">
      <p className="workspace-kicker">SESSION / STELE {STELE_VERSION}</p>
      <h2>Know what governs<br />this session.</h2>
      <p>Configure the egregore, inspect the boundaries, and carry the evidence with you.</p>
    </div>
    <section className="workspace-card workspace-state" aria-label="Session integrity">
      <div className="workspace-card-heading"><h3>{integrity.glyph} {integrity.label}</h3><span className="workspace-tag">{state.firedTobiraIds.length} TOBIRA fired</span></div>
      <p>{integrity.description}</p>
      <div className="workspace-capabilities">{capabilities.map(([label, allowed]) => <div key={label}><span>{label}</span><strong data-allowed={allowed}>{allowed ? 'Available' : 'Suspended'}</strong></div>)}</div>
      <button className="workspace-link" onClick={() => onNavigate('utsuroi')}>Inspect TOBIRA and UTSUROI →</button>
    </section>
    <div className="workspace-grid">
      <section className="workspace-card"><p className="workspace-kicker">01 / PROJECT CONTEXT</p><h3>{projects.length ? `${projects.length} active project${projects.length === 1 ? '' : 's'}` : 'Choose your context'}</h3><p>{projects.length ? projects.map(project => project.label).join(' · ') : 'Select projects in Config or the project rail. Until then, the output carries universal directives only.'}</p><p className="workspace-note">{triggers.length} active escalation triggers · {triggers.filter(trigger => trigger.locked).length} locked</p></section>
      <section className="workspace-card"><p className="workspace-kicker">02 / EGREGORE</p><h3>{findMode(state.sessionMode, state.userModes)?.label ?? state.sessionMode} · {state.verbosity}</h3><p>{state.outputSections.filter(section => section.enabled).length} output sections enabled. Changes appear in the compiled preview.</p><div className="workspace-actions"><button className="workspace-link" onClick={() => onNavigate('format')}>Edit format →</button><button className="workspace-link" onClick={() => onNavigate('modes')}>Author a mode →</button></div></section>
    </div>
    <AuditControls trail={auditTrail} integrityState={state.integrityState} />
    <section className="workspace-card"><div className="workspace-card-heading"><h3>What the evidence reaches</h3><span className="workspace-tag">{TOBIRA_REGISTRY.length} deterministic TOBIRA</span></div><p>Input and extraction-response checks can suspend a session. They do not establish universal prompt-injection prevention.</p><details><summary>Known boundaries and assurance work</summary><ul className="workspace-list"><li>Intra-word separators, visual homoglyphs, and encoded or semantic instructions remain outside demonstrated lexical coverage.</li><li>The optional durable audit mirror is best effort. No remote delivery or server verification is asserted by this screen.</li><li>Repository assurance experiments challenge impossible claims, empty scope, and dependency weakening. They are separate from this session’s audit chain.</li></ul><a className="workspace-link" href="https://github.com/mazze93/stele/tree/main/evals/assurance-integrity" target="_blank" rel="noreferrer">Read the reproducible assurance experiment ↗</a></details></section>
  </div>
}
