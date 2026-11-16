import { useState } from 'react'
import { verifyChain, type AuditTrail } from '@/lib/audit'
import type { IntegrityState } from '@/lib/integrity'
import { downloadText } from '@/lib/download'

type Check = { trail: AuditTrail; verdict: 'ZANSHIN' | 'KIRI' | 'WABI' }
export function AuditControls({ trail, integrityState }: { trail: AuditTrail; integrityState: IntegrityState }) {
  const [check, setCheck] = useState<Check | null>(null)
  const [checking, setChecking] = useState(false)
  async function verify() {
    const snapshot = trail
    setChecking(true)
    try { setCheck({ trail: snapshot, verdict: await verifyChain(snapshot) ? 'ZANSHIN' : 'KIRI' }) }
    catch { setCheck({ trail: snapshot, verdict: 'WABI' }) }
    finally { setChecking(false) }
  }
  const current = check?.trail === trail
  return <section className="workspace-card" aria-labelledby="audit-controls-heading">
    <div className="workspace-card-heading">
      <h3 id="audit-controls-heading">Local audit evidence</h3>
      <span className="workspace-tag">{trail.entries.length} entries</span>
    </div>
    <p>The SHA-256 chain records event metadata. Verify its internal consistency or export a snapshot before closing this tab.</p>
    <div className="workspace-actions">
      <button className="workspace-button" onClick={verify} disabled={checking || trail.entries.length === 0}>{checking ? 'Checking…' : 'Verify local chain'}</button>
      <button className="workspace-button" onClick={() => downloadText(`stele-audit-${trail.sessionId}.json`, JSON.stringify({ ...trail, currentState: integrityState }, null, 2))}>Export audit JSON</button>
    </div>
    <p role="status" aria-live="polite" className="workspace-status">
      {!check ? 'Not checked in this view.' : !current ? 'Trail changed — verify again.' : check.verdict === 'ZANSHIN' ? `ZANSHIN · ${check.trail.entries.length} entries checked.` : check.verdict === 'KIRI' ? 'KIRI · chain divergence detected.' : 'WABI · verification could not complete.'}
    </p>
    <p className="workspace-note">Consistency does not establish completeness, writer truth, or fidelity to an approved objective. This check does not verify the optional durable mirror.</p>
  </section>
}
