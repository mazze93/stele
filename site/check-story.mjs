// Verify public explanations against the production gate and capability table.
// This is a source contract, not a claim about general detection effectiveness.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'

const html = await readFile(new URL('./public/index.html', import.meta.url), 'utf8')
const scenes = [...html.matchAll(/<article class="story-scene" data-scene="([^"]+)">([\s\S]*?)<\/article>/g)]
assert.equal(scenes.length, 4)
const server = await createServer({ server: { middlewareMode: true, watch: null, ws: false }, logLevel: 'silent' })
try {
  const { gate } = await server.ssrLoadModule('/src/lib/security.ts')
  const { INTEGRITY_STATES, escalate } = await server.ssrLoadModule('/src/lib/integrity.ts')
  const capabilities = ['allowsExtraction', 'allowsApiCalls', 'allowsStateWrites', 'allowsPatchApplication']
  const receipts = []
  for (const [, state, content] of scenes) {
    // Decode only the one authored editorial marker. This is not a sanitizer;
    // unexpected markup is a contract error, never stripped and accepted.
    const input = content.match(/<blockquote>([\s\S]*?)<\/blockquote>/)[1]
      .replace('<mark>[U+200B]</mark>', '\u200b')
    assert(!input.includes('<') && !input.includes('>'), 'Unexpected markup in public gate example')
    const result = gate(input)
    assert.equal(result.recommendedTransition ?? 'ZANSHIN', state, input)
    const code = content.match(/<code>([^<]+)<\/code>/)[1]
    assert.equal(result.scanResult.fired.map(t => t.auditCode).join(', ') || 'No TOBIRA fired', code)
    const advertised = [...content.matchAll(/<dd>([^<]+)<\/dd>/g)].map(m => m[1])
    assert.deepEqual(advertised, capabilities.map(key => INTEGRITY_STATES[state][key] ? 'permitted' : 'suspended'))
    assert.equal(result.blocked, ['WABI', 'EPOCHÉ'].includes(state))
    receipts.push({ state, code, blocked: result.blocked, capabilities: advertised })
  }
  // The public narrative must preserve direct escalation and no de-escalation.
  assert.equal(escalate('ZANSHIN', 'EPOCHÉ'), 'EPOCHÉ')
  assert.equal(escalate('EPOCHÉ', 'UNHEIMLICH'), 'EPOCHÉ')
  console.log(JSON.stringify({ examples: receipts, directSuspension: true, monotonic: true }, null, 2))
} finally { await server.close() }
