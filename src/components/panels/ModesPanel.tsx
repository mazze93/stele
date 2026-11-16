import { useState } from 'react'
import { BUILT_IN_MODES, findMode, type CustomMode } from '@/data/modes'
import { applySessionPreset } from '@/data/defaults'
import type { DirectiveState, Verbosity } from '@/lib/types'
import { downloadText } from '@/lib/download'

type Props = { state: DirectiveState; onChange: (state: DirectiveState) => void }
export function ModesPanel({ state, onChange }: Props) {
  const [sourceId, setSourceId] = useState(state.sessionMode)
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const modes = [...BUILT_IN_MODES, ...state.userModes]
  const current = findMode(state.sessionMode, state.userModes)
  function fork() {
    const source = findMode(sourceId, state.userModes)
    if (!source || !label.trim()) return
    const mode: CustomMode = { ...source, id: `user-${crypto.randomUUID()}`, label: label.trim(), description: description.trim() || source.description, sections: [...source.sections], builtIn: false, forkedFrom: source.id }
    onChange(applySessionPreset({ ...state, userModes: [...state.userModes, mode] }, mode.id))
    setLabel(''); setDescription(''); setMessage(`TSUGI · ${mode.label} created and selected.`)
  }
  function update(mode: CustomMode) {
    onChange(applySessionPreset({ ...state, userModes: state.userModes.map(item => item.id === mode.id ? mode : item) }, mode.id))
  }
  function remove(id: string) {
    if (BUILT_IN_MODES.some(mode => mode.id === id)) return
    const remaining = { ...state, userModes: state.userModes.filter(mode => mode.id !== id) }
    onChange(state.sessionMode === id ? applySessionPreset(remaining, 'BUILD') : remaining)
    setSourceId('BUILD'); setMessage('TSUGI · user mode removed. BUILD selected if needed.')
  }
  return <div className="workspace-page">
    <div className="workspace-intro"><p className="workspace-kicker">OPERATOR AUTHORING</p><h2>Make the mode fit<br />the work.</h2><p>Fork a preset, choose its sections, and tune the output. Built-in modes remain protected.</p></div>
    <section className="workspace-card"><h3>Fork a mode</h3><div className="workspace-form"><label>Starting mode<select value={sourceId} onChange={event => setSourceId(event.target.value)}>{modes.map(mode => <option key={mode.id} value={mode.id}>{mode.label}{mode.builtIn ? ' · built-in' : ''}</option>)}</select></label><label>Mode name<input value={label} onChange={event => setLabel(event.target.value)} maxLength={60} placeholder="e.g. Release review" /></label><label>Description<textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={500} placeholder="What this mode is for" /></label><button className="workspace-button" disabled={!label.trim()} onClick={fork}>Create and select mode</button></div><p className="workspace-note">User modes live in this session and are cleared on reset or tab close. Export them before leaving. Automated extraction cannot author user modes.</p></section>
    <section className="workspace-card"><h3>Available modes</h3><div className="workspace-mode-list">{modes.map(mode => <div key={mode.id}><button className="workspace-button" aria-pressed={state.sessionMode === mode.id} onClick={() => onChange(applySessionPreset(state, mode.id))}>{mode.label}</button><span className="workspace-note">{mode.builtIn ? 'Built-in · protected' : 'Operator-authored'}</span>{!mode.builtIn && <button className="workspace-link" aria-label={`Delete ${mode.label}`} onClick={() => remove(mode.id)}>Delete</button>}</div>)}</div></section>
    {current && !current.builtIn && <section className="workspace-card"><h3>Edit {current.label}</h3><div className="workspace-form"><label>Selected mode name<input value={current.label} maxLength={60} onChange={event => update({ ...current, label: event.target.value })} /></label><label>Selected mode description<textarea value={current.description} maxLength={500} onChange={event => update({ ...current, description: event.target.value })} /></label><label>Mode verbosity<select value={current.verbosity} onChange={event => update({ ...current, verbosity: event.target.value as Verbosity })}>{['dense','standard','expanded'].map(value => <option key={value}>{value}</option>)}</select></label><fieldset><legend>Included output sections</legend>{state.outputSections.map(section => <label className="workspace-checkbox" key={section.id}><input type="checkbox" checked={current.sections.includes(section.id)} onChange={() => update({ ...current, sections: current.sections.includes(section.id) ? current.sections.filter(id => id !== section.id) : [...current.sections, section.id] })} />{section.label}</label>)}</fieldset></div></section>}
    <div className="workspace-actions"><button className="workspace-button" disabled={!state.userModes.length} onClick={() => downloadText('stele-user-modes.json', JSON.stringify({ userModes: state.userModes }, null, 2))}>Export user modes</button></div><p role="status" className="workspace-status">{message}</p>
  </div>
}
