// Trusted checker; accepts only a caller-pinned complete replay input snapshot.
// Candidate modules are synthetic fixtures, not arbitrary sandboxed agent code.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'

const [snapshotPath, expectedDigest] = process.argv.slice(2)
assert.ok(snapshotPath && /^[a-f0-9]{64}$/.test(expectedDigest ?? ''), 'EPOCHÉ: replay requires an externally supplied SHA-256 pin')
const bytes = readFileSync(snapshotPath)
const digest = value => createHash('sha256').update(value).digest('hex')
assert.equal(digest(bytes), expectedDigest, 'EPOCHÉ: replay input identity changed')
// Parse and execute only bytes from this authenticated read, never reopen inputs.
const { specification: baseline, files } = JSON.parse(bytes)
assert.deepEqual(Object.keys(files).sort(), ['claim.json', 'integrity.ts', 'proof.mjs', 'scope.mjs'])
assert.ok(Object.values(files).every(value => typeof value === 'string'))
assert.deepEqual(baseline.states, ['ZANSHIN', 'UNHEIMLICH', 'WABI', 'EPOCHÉ'])
assert.deepEqual(baseline.requiredWitnesses, ['WABI', 'EPOCHÉ'])
assert.ok(['suspended-deny', 'all-deny'].includes(baseline.claim))
assert.equal(baseline.precondition, 'suspended')
const candidate = JSON.parse(files['claim.json'])
const differences = ['claim', 'precondition'].filter(key => candidate[key] !== baseline[key])
const directory = mkdtempSync(join(tmpdir(), 'stele-pinned-replay-'))
try {
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(directory, name), content, { flag: 'wx', mode: 0o600 })
  }
  const { INTEGRITY_STATES: states } = await import(pathToFileURL(join(directory, 'integrity.ts')))
  const { inScope } = await import(pathToFileURL(join(directory, 'scope.mjs')))
  assert.equal(typeof inScope, 'function')
  // Reconstruct scope independently. Never execute proof.mjs or trust its coverage.
  const covered = baseline.states.filter(state => candidate.precondition === 'suspended' &&
    (candidate.claim === 'all-deny' || inScope(state) === true))
  const missingWitnesses = baseline.requiredWitnesses.filter(state => !covered.includes(state))
  const requiredDomain = baseline.claim === 'all-deny' ? baseline.states : baseline.requiredWitnesses
  const counterexamples = requiredDomain.filter(state => states[state]?.allowsExtraction !== false)
  process.stdout.write(JSON.stringify({
    inputDigest: expectedDigest,
    objectiveDigest: digest(JSON.stringify(baseline)),
    statementDifferences: differences,
    covered, missingWitnesses, counterexamples,
    decision: differences.length || missingWitnesses.length || counterexamples.length ? 'KIRI' : 'ZANSHIN',
  }) + '\n')
} finally { rmSync(directory, { recursive: true, force: true }) }
