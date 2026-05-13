// === INHERIT PANEL — GROUP 4 ===
// Paste zone for osmotic project inheritance.
// gate() runs before any content reaches the extractor.
// Diff-before-apply. Per-field confirmation. WABI = extraction suspended.

import { useState } from 'react'
import type { DirectiveState } from '@/lib/types'
import type { IntegrityState, StateTransition } from '@/lib/integrity'
import { INTEGRITY_STATES } from '@/lib/integrity'
import { gate } from '@/lib/security'
import type { GateResult } from '@/lib/security'
import { extractDirectivePatch } from '@/lib/extractor'
import type { ExtractorResult } from '@/lib/extractor'
import type { DirectiveStatePatch, ValidationResult } from '@/lib/extraction-schema'
import type { AuditAction, AuditEntry } from '@/lib/audit'

type AuditExtras = Omit<Partial<AuditEntry>, 'integrityHash' | 'timestamp' | 'action' | 'sessionId'>
type Status = 'idle' | 'gating' | 'extracting' | 'review' | 'applied' | 'blocked' | 'error'
type FileType = 'text' | 'markdown' | 'claude-md' | 'json'

const FILE_TYPES: { id: FileType; label: string }[] = [
  { id: 'text',      label: 'text'      },
  { id: 'markdown',  label: 'markdown'  },
  { id: 'claude-md', label: 'CLAUDE.md' },
  { id: 'json',      label: 'json'      },
]

type Props = {
  state:          DirectiveState
  integrityState: IntegrityState
  apiKey:         string
  onSetApiKey:    (key: string) => void
  onGateResult:   (r: GateResult) => void
  onApplyPatch:   (patch: DirectiveStatePatch) => void
  onAuditEntry:   (action: AuditAction, extras?: AuditExtras) => void
}

export function InheritPanel({
  state, integrityState, apiKey, onSetApiKey, onGateResult, onApplyPatch, onAuditEntry,
}: Props) {
  const [input,          setInput]          = useState('')
  const [fileType,       setFileType]       = useState<FileType>('text')
  const [status,         setStatus]         = useState<Status>('idle')
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null)
  const [gateResult,     setGateResult]     = useState<GateResult | null>(null)
  const [validation,     setValidation]     = useState<ValidationResult | null>(null)
  const [pendingPatch,   setPendingPatch]   = useState<DirectiveStatePatch | null>(null)
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
  const [keyInput,       setKeyInput]       = useState('')

  const integrity  = INTEGRITY_STATES[integrityState]
  const canExtract = integrity.allowsExtraction && integrity.allowsApiCalls
  const hasKey     = apiKey.trim().length > 0

  // API key gate
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

  // EPOCHÉ — defensive lockout (App-level lockout takes precedence; this guards in-flight renders)
  if (integrityState === 'EPOCHÉ') {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px', padding:'40px 24px', textAlign:'center' }}>
        <span style={{ fontFamily:'serif', fontSize:'36px', color:integrity.color }}>{integrity.glyph}</span>
        <span style={{ fontFamily:'var(--mono-font)', fontSize:'13px', color:integrity.color, letterSpacing:'0.1em' }}>EPOCHÉ</span>
        <p style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'rgba(200,80,128,0.7)', maxWidth:'320px', lineHeight:1.8, margin:0 }}>
          {integrity.description}
        </p>
      </div>
    )
  }

  // WABI — reduced operation, extraction suspended
  if (!canExtract) {
    return (
      <div style={{ padding:'14px 16px', background:integrity.colorDim, border:`1px solid ${integrity.color}`, borderRadius:'4px' }}>
        <p style={{ fontFamily:'var(--mono-font)', fontSize:'11px', color:integrity.color, margin:0 }}>
          {integrity.label} — extraction suspended
        </p>
        <p style={{ ...hint, marginTop:'6px' }}>
          API calls are not permitted in this integrity state. Reset the session to restore extraction.
        </p>
      </div>
    )
  }

  async function handleSubmit() {
    if (!input.trim()) return
    setStatus('gating')
    setGateResult(null)
    setValidation(null)
    setPendingPatch(null)
    setErrorMsg(null)

    const result = gate(input)
    setGateResult(result)
    onGateResult(result)

    if (result.blocked) {
      setStatus('blocked')
      return
    }

    setStatus('extracting')
    let extractResult: ExtractorResult
    try {
      extractResult = await extractDirectivePatch(apiKey, input)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Extraction failed')
      return
    }

    // T-006: YUGAMI/TESSITURA scan of the API response payload
    const responseScan = extractResult.scanResult
    if (responseScan.fired.length > 0) {
      const ORDER: Record<string, number> = { UNHEIMLICH: 1, WABI: 2, 'EPOCHÉ': 3 }
      let recTrans: StateTransition | null = null
      for (const t of responseScan.fired) {
        if ((ORDER[t.transition] ?? -1) > (recTrans ? ORDER[recTrans] : -1))
          recTrans = t.transition
      }
      const responseGateResult: GateResult = {
        blocked:               recTrans === 'EPOCHÉ' || recTrans === 'WABI',
        scanResult:            responseScan,
        recommendedTransition: recTrans,
        findings:              responseScan.fired.map(t => `[${t.auditCode}] ${t.message}`),
        charCount:             extractResult.rawResponse.length,
      }
      onGateResult(responseGateResult)
      if (responseGateResult.blocked) {
        setGateResult(responseGateResult)
        setStatus('blocked')
        return
      }
    }

    setValidation(extractResult.validation)
    const patch = extractResult.patch
    const fieldsExtracted = Object.keys(patch).filter(k => patch[k as keyof typeof patch] !== undefined)

    onAuditEntry('kohaku-extraction', {
      fieldsExtracted,
      secretsDetected: result.scanResult.secretsDetected,
    })

    if (fieldsExtracted.length === 0) {
      setStatus('error')
      setErrorMsg('No extractable fields found in content.')
      return
    }

    if (!extractResult.validation.valid) {
      setStatus('error')
      setErrorMsg(extractResult.validation.errors[0] ?? 'Validation failed')
      return
    }

    // Pre-select all available fields
    const allFields = new Set(Object.keys(patch).filter(k => patch[k as keyof typeof patch] !== undefined))
    setSelectedFields(allFields)
    setPendingPatch(patch)
    setStatus('review')
  }

  function toggleField(field: string) {
    setSelectedFields(prev => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  function handleConfirm() {
    if (!pendingPatch) return
    // Apply only the user-selected fields
    const confirmedPatch: DirectiveStatePatch = {}
    for (const field of selectedFields) {
      const key = field as keyof DirectiveStatePatch
      if (pendingPatch[key] !== undefined) {
        // TypeScript: safe cast via explicit key assignment
        (confirmedPatch as Record<string, unknown>)[key] = pendingPatch[key]
      }
    }
    const fieldsExtracted = [...selectedFields]
    onApplyPatch(confirmedPatch)
    onAuditEntry('tsugi-applied', { fieldsExtracted })
    setPendingPatch(null)
    setInput('')
    setValidation(null)
    setGateResult(null)
    setStatus('applied')
    setTimeout(() => setStatus('idle'), 1800)
  }

  function handleReject() {
    const fieldsRejected = pendingPatch
      ? Object.keys(pendingPatch).filter(k => pendingPatch[k as keyof typeof pendingPatch] !== undefined)
      : []
    onAuditEntry('kiri-rejected', { fieldsRejected })
    setPendingPatch(null)
    setSelectedFields(new Set())
    setStatus('idle')
  }

  function handleReset() {
    setInput('')
    setStatus('idle')
    setGateResult(null)
    setValidation(null)
    setPendingPatch(null)
    setSelectedFields(new Set())
    setErrorMsg(null)
  }

  const busy = status === 'gating' || status === 'extracting'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <section>
        <h3 style={sHead}>OSMOTIC INHERITANCE</h3>
        <p style={{ ...hint, marginTop:'6px' }}>
          Paste project context — CLAUDE.md, README, architecture notes, JSON config.
          Content passes through the TOBIRA gate before extraction.
        </p>
      </section>

      {/* File type selector */}
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
        {FILE_TYPES.map(ft => (
          <button key={ft.id} onClick={() => setFileType(ft.id)}
            style={{ padding:'5px 10px', background:fileType === ft.id ? 'var(--surface-raised)' : 'transparent', border:`1px solid ${fileType === ft.id ? 'var(--teal)' : 'var(--border-color)'}`, borderRadius:'3px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'10px', color:fileType === ft.id ? 'var(--teal)' : 'var(--vellum-dim)', touchAction:'manipulation' }}>
            {ft.label}
          </button>
        ))}
      </div>

      {/* Paste area */}
      {status !== 'review' && (
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={busy}
          placeholder={`Paste ${fileType} content here…`}
          style={{ background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'3px', color:'var(--vellum)', fontFamily:'var(--mono-font)', fontSize:'11px', padding:'10px 12px', width:'100%', minHeight:'160px', resize:'vertical', lineHeight:1.6, opacity:busy ? 0.5 : 1 }}
        />
      )}

      {/* Status messages */}
      {status === 'gating'     && <StatusRow color="var(--gold)"        text="Running TOBIRA gate…"           />}
      {status === 'extracting' && <StatusRow color="var(--teal)"        text="Extracting directive fields…"   />}
      {status === 'applied'    && <StatusRow color="var(--teal-bright)" text="TSUGI — patch applied."         />}

      {/* Gate findings */}
      {gateResult && gateResult.findings.length > 0 && (
        <div style={{ padding:'12px 14px', background:gateResult.blocked ? 'rgba(200,80,128,0.08)' : 'rgba(77,184,196,0.06)', border:`1px solid ${gateResult.blocked ? 'var(--coral)' : 'var(--border-color)'}`, borderRadius:'4px' }}>
          <p style={{ ...sHead, color:gateResult.blocked ? 'var(--coral)' : 'var(--vellum-faint)', marginBottom:'8px' }}>
            {gateResult.blocked ? 'TOBIRA FIRED — extraction blocked' : 'GATE PASSED — findings below'}
          </p>
          {gateResult.findings.map((f, i) => (
            <p key={i} style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-dim)', margin:'2px 0', lineHeight:1.5 }}>{f}</p>
          ))}
          {gateResult.blocked && (
            <button onClick={handleReset}
              style={{ marginTop:'10px', padding:'6px 12px', background:'transparent', border:'1px solid var(--coral)', borderRadius:'3px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--coral)', touchAction:'manipulation' }}>
              Reset
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {status === 'error' && errorMsg && (
        <div style={{ padding:'12px 14px', background:'rgba(200,80,128,0.06)', border:'1px solid var(--coral)', borderRadius:'4px' }}>
          <p style={{ ...sHead, color:'var(--coral)', marginBottom:'6px' }}>EXTRACTION FAILED</p>
          <p style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-dim)', margin:0 }}>{errorMsg}</p>
          <button onClick={handleReset}
            style={{ marginTop:'10px', padding:'6px 12px', background:'transparent', border:'1px solid var(--border-color)', borderRadius:'3px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-dim)', touchAction:'manipulation' }}>
            Reset
          </button>
        </div>
      )}

      {/* Dropped fields notice */}
      {validation && validation.droppedFields.length > 0 && (
        <p style={hint}>Dropped (not in schema): {validation.droppedFields.join(', ')}</p>
      )}

      {/* Patch review — diff before apply */}
      {status === 'review' && pendingPatch && (
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border-color)', borderRadius:'4px', overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-color)', background:'var(--cipher)' }}>
              <p style={sHead}>PROPOSED PATCH — review before applying</p>
            </div>
            <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:'6px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'20px 120px 1fr 1fr', gap:'8px', padding:'0 8px', marginBottom:'4px' }}>
                <span />
                <span />
                <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--vellum-faint)', letterSpacing:'0.08em' }}>CURRENT</span>
                <span style={{ fontFamily:'var(--mono-font)', fontSize:'8px', color:'var(--teal)', letterSpacing:'0.08em' }}>PROPOSED</span>
              </div>
              {renderPatchRows(pendingPatch, state).map((row, i) => {
                const checked = selectedFields.has(row.field)
                return (
                  <label key={i} style={{ display:'grid', gridTemplateColumns:'20px 120px 1fr 1fr', gap:'8px', alignItems:'center', padding:'6px 8px', background: checked ? 'var(--cipher)' : 'rgba(0,0,0,0.3)', borderRadius:'3px', border:`1px solid ${checked ? 'var(--border-color)' : 'transparent'}`, cursor:'pointer', opacity: checked ? 1 : 0.45 }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleField(row.field)}
                      style={{ accentColor:'var(--teal)', width:'14px', height:'14px', cursor:'pointer' }} />
                    <span style={{ fontFamily:'var(--mono-font)', fontSize:'9px', color:'var(--vellum-faint)', letterSpacing:'0.06em' }}>{row.field}</span>
                    <span style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--vellum-faint)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.current}</span>
                    <span style={{ fontFamily:'var(--mono-font)', fontSize:'10px', color:'var(--teal-bright)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.proposed}</span>
                  </label>
                )
              })}
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={handleConfirm}
              disabled={selectedFields.size === 0}
              style={{ flex:1, padding:'10px', background: selectedFields.size > 0 ? 'rgba(77,184,196,0.1)' : 'transparent', border:`1px solid ${selectedFields.size > 0 ? 'var(--teal)' : 'var(--border-color)'}`, borderRadius:'3px', cursor: selectedFields.size > 0 ? 'pointer' : 'default', fontFamily:'var(--mono-font)', fontSize:'11px', color: selectedFields.size > 0 ? 'var(--teal)' : 'var(--vellum-faint)', touchAction:'manipulation', letterSpacing:'0.08em', opacity: selectedFields.size > 0 ? 1 : 0.5 }}>
              TSUGI — apply {selectedFields.size} field{selectedFields.size !== 1 ? 's' : ''}
            </button>
            <button onClick={handleReject}
              style={{ padding:'10px 16px', background:'transparent', border:'1px solid var(--border-color)', borderRadius:'3px', cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'11px', color:'var(--vellum-dim)', touchAction:'manipulation', letterSpacing:'0.08em' }}>
              KIRI
            </button>
          </div>
        </div>
      )}

      {/* Submit button */}
      {(status === 'idle' || status === 'blocked' || status === 'error') && (
        <button onClick={handleSubmit}
          disabled={!input.trim()}
          style={{ padding:'10px', background:'transparent', border:`1px solid ${input.trim() ? 'var(--teal-bright)' : 'var(--border-color)'}`, borderRadius:'3px', cursor: input.trim() ? 'pointer' : 'default', fontFamily:'var(--mono-font)', fontSize:'11px', color:input.trim() ? 'var(--teal-bright)' : 'var(--vellum-faint)', letterSpacing:'0.08em', touchAction:'manipulation', opacity:input.trim() ? 1 : 0.5 }}>
          Gate + Extract
        </button>
      )}
    </div>
  )
}

type PatchRow = { field: string; current: string; proposed: string }

function renderPatchRows(patch: DirectiveStatePatch, state: DirectiveState): PatchRow[] {
  const rows: PatchRow[] = []
  if (patch.activeProjectIds !== undefined)
    rows.push({ field: 'activeProjectIds', current: state.activeProjectIds.join(', ') || '—', proposed: patch.activeProjectIds.join(', ') || '—' })
  if (patch.sessionMode !== undefined)
    rows.push({ field: 'sessionMode', current: state.sessionMode, proposed: patch.sessionMode })
  if (patch.verbosity !== undefined)
    rows.push({ field: 'verbosity', current: state.verbosity, proposed: patch.verbosity })
  if (patch.themeId !== undefined)
    rows.push({ field: 'themeId', current: state.themeId, proposed: patch.themeId })
  if (patch.hygieneTrigger !== undefined)
    rows.push({ field: 'hygieneTrigger', current: state.hygieneTrigger, proposed: patch.hygieneTrigger })
  if (patch.openQuestions !== undefined && patch.openQuestions.length > 0)
    rows.push({ field: 'openQuestions', current: `${state.openQuestions.length} existing`, proposed: `+${patch.openQuestions.length} new` })
  return rows
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
