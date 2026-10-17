// JSONL transport only; all verdicts come from the production gate.
import { createInterface } from 'node:readline'
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true, watch: null }, logLevel: 'silent' })
try {
  const { gate } = await server.ssrLoadModule('/src/lib/security.ts')
  for await (const line of createInterface({ input: process.stdin })) {
    const { content } = JSON.parse(line)
    const result = gate(content)
    const rank = { ZANSHIN: 0, UNHEIMLICH: 1, WABI: 2, 'EPOCHÉ': 3 }
    process.stdout.write(JSON.stringify({ score: rank[result.recommendedTransition ?? 'ZANSHIN'] / 3,
      factors: result.scanResult.fired.map(t => t.id), extracted: [] }) + '\n')
  }
} finally { await server.close() }
