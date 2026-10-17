import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EpocheLockout } from '../EpocheLockout'

describe('EPOCHÉ presentation boundary', () => {
  it('offers only deliberate reset and displays the observed reason', () => {
    const html = renderToStaticMarkup(<EpocheLockout
      firedTobira={[{ auditCode: 'KAPU-001', message: 'Explicit governance override detected in input.' }]}
      sessionId="synthetic-session" auditCount={3} onReset={() => {}} />)
    expect(html.match(/<button\b/g)).toHaveLength(1)
    expect(html).toContain('RESET — new ZANSHIN session')
    expect(html).toContain('KAPU-001')
    expect(html).toContain('3 audit entries')
    expect(html).not.toMatch(/<(?:input|textarea|a)\b/)
  })

  it('renders an untrusted diagnostic as text', () => {
    const html = renderToStaticMarkup(<EpocheLockout
      firedTobira={[{ auditCode: 'UNKNOWN', message: '<img src=x onerror=alert(1)>' }]}
      sessionId="synthetic-session" auditCount={1} onReset={() => {}} />)
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('<img')
  })
})
