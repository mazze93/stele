import { useState } from 'react'
import type { DirectiveState } from '@/lib/types'
import type { ThemeId } from '@/data/themes'
import type { IntegrityState } from '@/lib/integrity'
import type { AuditTrail, AuditAction, AuditEntry } from '@/lib/audit'
import type { GateResult } from '@/lib/security'
import type { DirectiveStatePatch } from '@/lib/extraction-schema'
import type { NarrativeFields } from '@/lib/extractor'
import { FormatPanel }       from './panels/FormatPanel'
import { EscalationPanel }   from './panels/EscalationPanel'
import { QuestionsPanel }    from './panels/QuestionsPanel'
import { AppendPanel }       from './panels/AppendPanel'
import { ThemePanel }        from './panels/ThemePanel'
import { UtsuroiPanel }      from './panels/UtsuroiPanel'
import { InheritPanel }      from './panels/InheritPanel'
import { CollaboratorPanel } from './panels/CollaboratorPanel'

type AuditExtras = Omit<Partial<AuditEntry>, 'integrityHash' | 'timestamp' | 'action' | 'sessionId'>

type Tab = 'format' | 'governance' | 'questions' | 'append' | 'theme' | 'utsuroi' | 'inherit' | 'collaborator'
const TABS: { id: Tab; label: string }[] = [
  { id:'format',       label:'Format'       },
  { id:'governance',   label:'Governance'   },
  { id:'questions',    label:'Questions'    },
  { id:'append',       label:'Append'       },
  { id:'theme',        label:'Theme'        },
  { id:'utsuroi',      label:'歪 UTSUROI'  },
  { id:'inherit',      label:'Inherit'      },
  { id:'collaborator', label:'Collaborator' },
]

type Props = {
  state:            DirectiveState
  onChange:         (n: DirectiveState) => void
  auditTrail:       AuditTrail
  integrityState:   IntegrityState
  apiKey:           string
  onSetApiKey:      (key: string) => void
  onGateResult:     (r: GateResult) => void
  onApplyPatch:     (patch: DirectiveStatePatch) => void
  onApplyNarrative: (projectId: string, narrative: NarrativeFields) => void
  onAuditEntry:     (action: AuditAction, extras?: AuditExtras) => void
}

export function LeverPanel({
  state, onChange, auditTrail, integrityState, apiKey, onSetApiKey,
  onGateResult, onApplyPatch, onApplyNarrative, onAuditEntry,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('format')

  const narrativeCount = state.activeProjectIds.filter(id => {
    const n = state.projectNarratives?.[id]
    return n && Object.values(n).some(v => v && v.trim().length > 0)
  }).length

  const badges: Partial<Record<Tab, string>> = {
    questions:  state.openQuestions.length > 0 ? String(state.openQuestions.length) : undefined,
    governance: String(state.escalationTriggers.filter(e => e.enabled).length),
    append:     state.customAppend.trim().length > 0 ? '•' : undefined,
    utsuroi:    state.firedTobiraIds.length > 0 ? String(state.firedTobiraIds.length) : undefined,
    // Inherit badge: any TOBIRA fired this session = security event occurred on paste surface
    inherit:    state.firedTobiraIds.length > 0 ? '⚑' : undefined,
    collaborator: narrativeCount > 0 ? String(narrativeCount) : undefined,
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
      <div style={{ display:'flex', borderBottom:'1px solid var(--border-color)', padding:'0 16px', overflowX:'auto', flexShrink:0 }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id
          const badge  = badges[tab.id]
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'12px 14px', flexShrink:0, background:'transparent', border:'none', borderBottom:`2px solid ${active?'var(--teal-bright)':'transparent'}`, cursor:'pointer', fontFamily:'var(--mono-font)', fontSize:'11px', color:active?'var(--teal-bright)':'var(--vellum-dim)', letterSpacing:'0.04em', marginBottom:'-1px', transition:'all 0.1s', touchAction:'manipulation' }}>
              {tab.label}
              {badge && <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', minWidth:'16px', height:'16px', padding:'0 4px', background:active?'var(--teal)':'var(--surface-raised)', borderRadius:'8px', fontFamily:'var(--mono-font)', fontSize:'9px', color:active?'var(--vellum)':'var(--vellum-dim)' }}>{badge}</span>}
            </button>
          )
        })}
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'24px' }}>
        {activeTab === 'format'       && <FormatPanel     state={state} onChange={onChange} />}
        {activeTab === 'governance'   && <EscalationPanel state={state} onChange={onChange} />}
        {activeTab === 'questions'    && <QuestionsPanel  state={state} onChange={onChange} />}
        {activeTab === 'append'       && <AppendPanel     state={state} onChange={onChange} />}
        {activeTab === 'theme'        && <ThemePanel activeThemeId={state.themeId as ThemeId} onChange={(id) => onChange({...state,themeId:id})} />}
        {activeTab === 'utsuroi'      && <UtsuroiPanel state={state} integrityState={integrityState} firedTobiraIds={state.firedTobiraIds} auditTrail={auditTrail} />}
        {activeTab === 'inherit'      && (
          <InheritPanel
            state={state}
            integrityState={integrityState}
            apiKey={apiKey}
            onSetApiKey={onSetApiKey}
            onGateResult={onGateResult}
            onApplyPatch={onApplyPatch}
            onAuditEntry={onAuditEntry}
          />
        )}
        {activeTab === 'collaborator' && (
          <CollaboratorPanel
            state={state}
            integrityState={integrityState}
            apiKey={apiKey}
            onSetApiKey={onSetApiKey}
            onGateResult={onGateResult}
            onApplyNarrative={onApplyNarrative}
            onAuditEntry={onAuditEntry}
          />
        )}
      </div>
    </div>
  )
}
