import { useState } from 'react'
import type { DirectiveState } from '@/lib/types'
import type { NarrativeFields } from '@/lib/extractor'
import { gate } from '@/lib/security'
import type { GateResult } from '@/lib/security'
import { INTEGRITY_STATES } from '@/lib/integrity'
import { parseProjectObservations } from '@/lib/project-observations'
import type { ProjectObservation } from '@/lib/project-observations'
import report from '@/data/project-observations.json'
import { buildProjectNarrativeExport, downloadNarrativeExport } from '@/lib/narrativeExport'
import { PROJECTS } from '@/data/projects'

const bundled = parseProjectObservations(JSON.stringify(report))

type Props = {
  state: DirectiveState
  onGateResult: (result: GateResult) => void
  onApply: (projectId: string, narrative: NarrativeFields) => void
}

export function ProjectObservationPanel({ state, onApply, onGateResult }: Props) {
  const [observations, setObservations] = useState(bundled)
  const [selected, setSelected] = useState<ProjectObservation | null>(null)
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('')
  const active = observations.filter(project => state.activeProjectIds.includes(project.projectId))
  const allowed = INTEGRITY_STATES[state.integrityState].allowsPatchApplication

  async function load(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 100_000) throw new Error('Observation file exceeds 100,000 bytes')
      const next = parseProjectObservations(await file.text())
      setObservations(next)
      setSelected(null)
      setDraft('')
      setMessage('Repository observations loaded for review.')
    } catch {
      setMessage('KIRI — observation file rejected. Use an unmodified Stele CI observation artifact.')
    }
  }

  function review(observation: ProjectObservation) {
    setSelected(observation)
    setDraft(observation.description)
    setMessage('')
  }

  function apply() {
    if (!selected || !allowed || !state.activeProjectIds.includes(selected.projectId)) return
    const result = gate(draft)
    onGateResult(result)
    if (result.blocked) {
      setMessage('KIRI — TOBIRA blocked the identity draft.')
      return
    }
    const project = PROJECTS.find(item => item.id === selected.projectId)
    if (!project) return
    const current = state.projectNarratives[selected.projectId]
    onApply(project.id, {
      identity: `${draft}\n\nRepository description observed ${selected.observedAt} at https://github.com/${selected.repository}/tree/${selected.commit}. Developer-reviewed session draft.`,
      philosophy: current?.philosophy ?? project.philosophy ?? '',
      buildSequencing: current?.buildSequencing ?? project.buildSequencing ?? '',
      unstatedConstraints: current?.unstatedConstraints ?? project.unstatedConstraints ?? '',
    })
    setMessage('TSUGI — reviewed identity applied to this session. Export the narrative to retain it.')
  }

  return <section className="workspace-card" aria-label="Repository observations">
    <h3>Osmotic project context</h3>
    <p>Review revision-pinned repository observations before applying an identity draft. Repository descriptions are author statements. The recorded commit identifies the observed source.</p>
    <label className="workspace-link">Load CI observations <input type="file" accept=".json,application/json" onChange={event => { void load(event.target.files?.[0]) }} /></label>
    {active.length === 0 && <p>Select a project in Config to review its repository context.</p>}
    <div className="workspace-actions">{active.map(item => <button key={item.projectId} className="workspace-link" onClick={() => review(item)}>{PROJECTS.find(project => project.id === item.projectId)?.label}</button>)}</div>
    {selected && <div>
      <p>{selected.repository} · {selected.language}</p>
      <p className="workspace-note">Observed {selected.observedAt} · {selected.commit.slice(0, 12)}</p>
      <ul>{selected.sources.map(source => <li key={source.path}><a href={source.url} target="_blank" rel="noreferrer">{source.path} at observed revision</a></li>)}</ul>
      <label>Identity draft<textarea aria-label="Observed identity draft" value={draft} onChange={event => setDraft(event.target.value)} rows={4} style={{ width: '100%', color: 'var(--vellum)', background: 'var(--surface)', border: '1px solid var(--border-color)' }} /></label>
      <button className="workspace-link" disabled={!allowed || !draft.trim()} onClick={apply}>Apply reviewed identity to session</button>
      {!allowed && <p>{state.integrityState} — patch application suspended.</p>}
    </div>}
    {selected && state.projectNarratives[selected.projectId] && <button className="workspace-link" onClick={() => {
      const project = PROJECTS.find(item => item.id === selected.projectId)
      if (project) downloadNarrativeExport(buildProjectNarrativeExport(project, state, {}))
    }}>Export reviewed project narrative</button>}
    {message && <p role="status">{message}</p>}
  </section>
}
