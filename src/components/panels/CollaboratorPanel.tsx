import { useState } from 'react'
import type { DirectiveState } from '@/lib/types'
import type { IntegrityState } from '@/lib/integrity'
import { INTEGRITY_STATES } from '@/lib/integrity'
import { gate } from '@/lib/security'
import type { GateResult } from '@/lib/security'
import { callCollaborator } from '@/lib/extractor'
import type { NarrativeFields, ProjectContext } from '@/lib/extractor'
import { PROJECTS } from '@/data/projects'
import type { AuditAction, AuditEntry } from '@/lib/audit'

type AuditExtras = Omit<Partial<AuditEntry>, 'integrityHash' | 'timestamp' | 'action' | 'sessionId'>
type Status = 'idle' | 'gating' | 'calling' | 'applied' | 'blocked' | 'error'

const FIELDS = ['identity', 'philosophy', 'buildSequencing', 'unstatedConstraints'] as const

type Props = {
  state:            DirectiveState
  integrityState:   IntegrityState
  apiKey:           string
  onSetApiKey:      (key: string) => void
  onGateResult:     (r: GateResult) => void
  onApplyNarrative: (projectId: string, narrative: NarrativeFields) => void
  onAuditEntry:     (action: AuditAction, extras?: AuditExtras) => void
}

export function CollaboratorPanel({
  state, integrityState, apiKey, onSetApiKey, onGateResult, onApplyNarrative, onAuditEntry,
}: Props) {
  const activeProjects = PROJECTS.filter(p => state.activeProjectIds.includes(p.id))

  const [selectedId,  setSelectedId]  = useState<string>(activeProjects[0]?.id ?? '')
  const [status,      setStatus]      = useState<Status>('idle')
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)
  const [gateResult,  setGateResult]  = useState<GateResult | null>(null)
  const [keyInput,    setKeyInput]    = useState('')
  const [fields,      setFields]      = useState<Record<string, string>>({
    identity: '', philosophy: '', buildSequencing: '', unstatedConstraints: '',
  })

  const integrity = INTEGRITY_STATES[integrityState]
  const canCall   = integrity.allowsApiCalls
  const hasKey    = apiKey.trim().length > 0

  const selectedProject   = PROJECTS.find(p => p.id === selectedId)
  const existingNarrative = state.projectNarratives?.[selectedId]

  if (!hasKey) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
        <div style={{ padding:'16px', background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'4px' }}>
          <p style={sHead}>API KEY REQUIRED</p>
          <p style={{ ...hint, marginTop:'8px', marginBottom:'16px' }}>
            Key is held in session memory only and cleared on reset. Never logged. Never persisted.
          </p>
          <div style={{ display:'flex', gap:'8px' }}>
            <input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && keyInput.trim()) onSetApiKey(keyInput.trim()) }}
              placeholder="sk-ant-..."
              autoComplete="off"
              spellCheck={false}
              style={{ flex:1, background:'var(--cipher)', border:'1px solid var(--border-color)', borderRadius:'3px', color:'var(--vellum)', fontFamily:'var(--mono-font)', fontSize:'11px', padding:'8px 10px' }}
            />
            <button onClick={() => { if (keyInput.trim()) onSetApiKey(keyInput.trim()) }}
              disabled={!keyInput.trim()}
              style={{ padding:'8px 16px', background:'transparent', border:'1px solid var(--teal)', borderRadius:'3px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'11px', color:'var(--teal)', touchAction:'manipulation', opacity:keyInput.trim() ? 1 : 0.4 }}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!canCall) {
    return (
      <div style={{ padding:'14px 16px', background:integrity.colorDim, border:`1px solid ${integrity.color}`, borderRadius:'4px' }}>
        <p style={{ fontFamily:'var(--mono-font)', fontSize:'11px', color:integrity.color, margin:0 }}>
          {integrity.label} — API calls suspended
        </p>
        <p style={{ ...hint, marginTop:'6px' }}>Reset the session to restore this capability.</p>
      </div>
    )
  }

  if (activeProjects.length === 0) {
    return <p style={hint}>No active projects. Add a project in the Config panel first.</p>
  }

  async function handleGenerate() {
    if (!selectedProject) return
    setStatus('gating')
    setGateResult(null)
    setErrorMsg(null)

    const serialized = JSON.stringify({
      stack:         selectedProject.stack,
      posture:       selectedProject.posture,
      hardStops:     selectedProject.hardStops,
      compliance:    selectedProject.compliance,
      tesserae:      (selectedProject.tesserae ?? []).map(t => ({ module: t.module, missingHalf: t.missingHalf, group: t.group })),
      openQuestions: selectedProject.openQuestions,
    })

    const result = gate(serialized)
    setGateResult(result)
    onGateResult(result)

    if (result.blocked) {
      setStatus('blocked')
      return
    }

    setStatus('calling')

    const projectCtx: ProjectContext = {
      id:            selectedProject.id,
      stack:         selectedProject.stack,
      posture:       selectedProject.posture,
      compliance:    selectedProject.compliance,
      hardStops:     selectedProject.hardStops,
      tesserae:      (selectedProject.tesserae ?? []).map(t => ({ module: t.module, missingHalf: t.missingHalf, group: t.group })),
      openQuestions: selectedProject.openQuestions,
    }

    try {
      const narrative: NarrativeFields = await callCollaborator(apiKey, projectCtx)
      setFields({
        identity:            narrative.identity,
        philosophy:          narrative.philosophy,
        buildSequencing:     narrative.buildSequencing,
        unstatedConstraints: narrative.unstatedConstraints,
      })
      onAuditEntry('kohaku-extraction', { fieldsExtracted: ['identity', 'philosophy', 'buildSequencing', 'unstatedConstraints'] })
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Collaborator call failed')
    }
  }

  function handleApply() {
    if (!selectedId) return
    const narrative: NarrativeFields = {
      identity:            fields.identity,
      philosophy:          fields.philosophy,
      buildSequencing:     fields.buildSequencing,
      unstatedConstraints: fields.unstatedConstraints,
    }
    onApplyNarrative(selectedId, narrative)
    onAuditEntry('tsugi-applied', { fieldsExtracted: ['identity', 'philosophy', 'buildSequencing', 'unstatedConstraints'] })
    setStatus('applied')
    setTimeout(() => setStatus('idle'), 1800)
  }

  function handleReject() {
    onAuditEntry('kiri-rejected', { fieldsRejected: ['identity', 'philosophy', 'buildSequencing', 'unstatedConstraints'] })
    setFields({ identity: '', philosophy: '', buildSequencing: '', unstatedConstraints: '' })
    setStatus('idle')
  }

  const hasFields  = FIELDS.some(f => fields[f].trim().length > 0)
  const busy       = status === 'gating' || status === 'calling'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <section>
        <h3 style={sHead}>PHILOSOPHER-SCRIBE</h3>
        <p style={{ ...hint, marginTop:'6px' }}>
          Authors the narrative fields a developer cannot easily articulate from inside the work —
          identity, philosophy, build sequencing rationale, unstated constraints.
          Reads structural project data only. Never processes user-supplied text.
        </p>
      </section>

      {/* Project selector — active projects only */}
      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
        <p style={{ ...sHead, marginBottom:'6px' }}>Active project</p>
        {activeProjects.map(p => {
          const hasNarrative = !!state.projectNarratives?.[p.id]?.identity
          return (
            <button key={p.id}
              onClick={() => {
                setSelectedId(p.id)
                setFields({ identity: '', philosophy: '', buildSequencing: '', unstatedConstraints: '' })
                setStatus('idle')
              }}
              style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', minHeight:'44px', background:selectedId === p.id ? 'var(--surface-raised)' : 'var(--surface)', border:`1px solid ${selectedId === p.id ? 'var(--teal)' : 'var(--border-color)'}`, borderRadius:'3px', cursor:'pointer', touchAction:'manipulation', textAlign:'left', width:'100%' }}>
              <span style={{ fontFamily:'var(--mono-font)', fontSize:'11px', color:selectedId === p.id ? 'var(--teal-bright)' : 'var(--vellum-dim)', flex:1 }}>{p.label}</span>
              {hasNarrative && <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--gold)', border:'1px solid var(--gold)', borderRadius:'2px', padding:'1px 5px' }}>authored</span>}
            </button>
          )
        })}
      </div>

      {/* Status messages */}
      {status === 'gating'  && <StatusRow color="var(--gold)"        text="Running TOBIRA gate on project data…" />}
      {status === 'calling' && <StatusRow color="var(--teal)"        text="Philosopher-scribe at work…"          />}
      {status === 'applied' && <StatusRow color="var(--teal-bright)" text="TSUGI — narrative applied to session." />}

      {/* Gate findings */}
      {gateResult && gateResult.findings.length > 0 && (
        <div style={{ padding:'12px 14px', background:gateResult.blocked ? 'rgba(200,80,128,0.08)' : 'rgba(77,184,196,0.06)', border:`1px solid ${gateResult.blocked ? 'var(--coral)' : 'var(--border-color)'}`, borderRadius:'4px' }}>
          <p style={{ ...sHead, color:gateResult.blocked ? 'var(--coral)' : 'var(--vellum-faint)', marginBottom:'8px' }}>
            {gateResult.blocked ? 'TOBIRA FIRED — call blocked' : 'GATE PASSED'}
          </p>
          {gateResult.findings.map((f, i) => (
            <p key={i} style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-dim)', margin:'2px 0', lineHeight:1.5 }}>{f}</p>
          ))}
        </div>
      )}

      {/* Error */}
      {status === 'error' && errorMsg && (
        <div style={{ padding:'12px 14px', background:'rgba(200,80,128,0.06)', border:'1px solid var(--coral)', borderRadius:'4px' }}>
          <p style={{ ...sHead, color:'var(--coral)', marginBottom:'6px' }}>CALL FAILED</p>
          <p style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-dim)', margin:0 }}>{errorMsg}</p>
        </div>
      )}

      {/* Generate button */}
      {!busy && (
        <button onClick={handleGenerate}
          disabled={!selectedProject}
          style={{ padding:'10px', background:'transparent', border:`1px solid ${selectedProject ? 'var(--gold)' : 'var(--border-color)'}`, borderRadius:'3px', cursor:selectedProject ? 'pointer' : 'default', fontFamily:'var(--mono-font)', fontSize:'11px', color:selectedProject ? 'var(--gold)' : 'var(--vellum-faint)', letterSpacing:'0.08em', touchAction:'manipulation', opacity:selectedProject ? 1 : 0.5 }}>
          Generate narrative
        </button>
      )}

      {/* Editable narrative fields */}
      {hasFields && (
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'4px', overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-color)', background:'var(--cipher)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <p style={sHead}>AUTHORED NARRATIVE — {selectedProject?.label}</p>
              {existingNarrative?.identity && (
                <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--gold)' }}>replaces existing</span>
              )}
            </div>
            <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:'14px' }}>
              {FIELDS.map(field => (
                <div key={field}>
                  <p style={{ ...sHead, marginBottom:'6px', color:'var(--teal)' }}>{field}</p>
                  <textarea
                    value={fields[field]}
                    onChange={e => setFields(prev => ({ ...prev, [field]: e.target.value }))}
                    rows={4}
                    spellCheck={false}
                    style={{ width:'100%', background:'var(--cipher)', border:'1px solid var(--border-color)', borderRadius:'3px', color:'var(--vellum-dim)', fontFamily:'var(--mono-font)', fontSize:'10px', lineHeight:1.7, padding:'8px 10px', resize:'vertical', boxSizing:'border-box' }}
                  />
                </div>
              ))}
            </div>
          </div>

          <p style={{ ...hint, padding:'8px 12px', background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'3px' }}>
            Narrative is session-only — copy fields to <code style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--teal)' }}>projects.ts</code> to persist across sessions.
          </p>

          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={handleApply}
              style={{ flex:1, padding:'10px', background:'rgba(77,184,196,0.1)', border:'1px solid var(--teal)', borderRadius:'3px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'11px', color:'var(--teal)', touchAction:'manipulation', letterSpacing:'0.08em' }}>
              Apply to session
            </button>
            <button onClick={handleReject}
              style={{ padding:'10px 16px', background:'transparent', border:'1px solid var(--border-color)', borderRadius:'3px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'11px', color:'var(--vellum-dim)', touchAction:'manipulation', letterSpacing:'0.08em' }}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusRow({ color, text }: { color: string; text: string }) {
  return (
    <div style={{ padding:'10px 14px', background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'3px' }}>
      <span style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color, letterSpacing:'0.06em' }}>{text}</span>
    </div>
  )
}

const sHead: React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'8px', letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--vellum-faint)', margin:0 }
const hint:  React.CSSProperties = { fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-faint)', margin:0, lineHeight:1.6 }
