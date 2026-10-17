import { useEffect, useRef } from 'react'

export interface Props {
  firedTobira: { auditCode: string; message: string }[]
  sessionId: string
  auditCount: number
  onReset: () => void
}

export function EpocheLockout({ firedTobira, sessionId, auditCount, onReset }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  return (
    <main className="epoche-lockout" aria-labelledby="epoche-title">
      <div className="epoche-inscription">
        <p className="epoche-kicker">STELE · DELIBERATE SUSPENSION</p>
        <h1 id="epoche-title" ref={heading} tabIndex={-1} aria-describedby="epoche-reason">EPOCHÉ</h1>
        <p className="epoche-verdict">The directive is suspended.</p>
        <p className="epoche-reason" id="epoche-reason">
          A condition requiring suspension was detected. Continuing would treat
          the directive as trustworthy when its integrity is in doubt.
        </p>
        <div className="epoche-observations">
          <h2>TOBIRA fired this session</h2>
          <ul>
            {firedTobira.map((t, i) => <li key={i}><b>{t.auditCode}</b><span>{t.message}</span></li>)}
          </ul>
        </div>
        <p className="epoche-capabilities">Extraction suspended · Model calls suspended · Edits suspended</p>
        <p className="epoche-recovery">The egregore is suspended—not destroyed. Only a deliberate reset starts a new ZANSHIN session.</p>
        <button className="epoche-reset" onClick={onReset}>RESET — new ZANSHIN session</button>
        <p className="epoche-receipt">session: {sessionId} · {firedTobira.length} TOBIRA fired · {auditCount} audit entries</p>
      </div>
    </main>
  )
}
