import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const replay = fileURLToPath(new URL('./replay.mjs', import.meta.url))
const specification = JSON.parse(readFileSync(new URL('./objective.json', import.meta.url)))
const files = {
  'claim.json': JSON.stringify({ claim: 'suspended-deny', precondition: 'suspended' }),
  'integrity.ts': readFileSync(new URL('../../src/lib/integrity.ts', import.meta.url), 'utf8'),
  'scope.mjs': "export const inScope = state => state === 'WABI' || state === 'EPOCHÉ'\n",
  'proof.mjs': 'throw new Error("candidate proof must never be the oracle")',
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'stele-replay-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const path = join(root, 'snapshot.json')
  const contents = JSON.stringify({ specification, files })
  writeFileSync(path, contents)
  const run = (pin = hash(contents)) => spawnSync(process.execPath, [replay, path, pin], { encoding: 'utf8', timeout: 10000 })
  return { root, path, contents, run }
}
test('accepts unchanged and comment-only controls without executing candidate proof', t => {
  const f = fixture(t)
  assert.equal(JSON.parse(f.run().stdout).decision, 'ZANSHIN')
  const input = JSON.parse(f.contents)
  input.files['integrity.ts'] += '\n// comment-only control\n'
  const bytes = JSON.stringify(input)
  writeFileSync(f.path, bytes)
  assert.equal(JSON.parse(f.run(hash(bytes)).stdout).decision, 'ZANSHIN')
})
test('rejects empty scope and partial witnesses even with forged proof coverage and a valid input pin', t => {
  const f = fixture(t)
  for (const scope of ['false', "state === 'WABI'"]) {
    const input = JSON.parse(f.contents)
    input.files['scope.mjs'] = `export const inScope = state => ${scope}`
    input.files['proof.mjs'] = 'console.log(JSON.stringify({covered:["WABI","EPOCHÉ"],holds:true}))'
    const bytes = JSON.stringify(input)
    writeFileSync(f.path, bytes)
    const run = f.run(hash(bytes))
    assert.equal(run.status, 0, run.stderr)
    const result = JSON.parse(run.stdout)
    assert.equal(result.decision, 'KIRI')
    assert.ok(result.missingWitnesses.includes('EPOCHÉ'))
  }
})
test('requires the external pin and authenticates all inputs before candidate imports', t => {
  const f = fixture(t)
  assert.notEqual(f.run('').status, 0)
  assert.notEqual(f.run('0'.repeat(64)).status, 0)
  const marker = join(f.root, 'executed')
  for (const file of Object.keys(files)) {
    const input = JSON.parse(f.contents)
    input.files[file] += '\nmodified'
    input.files['scope.mjs'] = `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'executed'); export const inScope = () => true`
    writeFileSync(f.path, JSON.stringify(input))
    assert.notEqual(f.run().status, 0)
    assert.equal(existsSync(marker), false)
  }
  const input = JSON.parse(f.contents)
  input.specification.requiredWitnesses = []
  writeFileSync(f.path, JSON.stringify(input))
  assert.notEqual(f.run().status, 0)
  assert.notEqual(f.run(hash(JSON.stringify(input))).status, 0)
})
