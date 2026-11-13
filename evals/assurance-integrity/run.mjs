// Trusted experiment driver. Candidate modules execute only as local synthetic fixtures.
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const output = resolve(process.argv[2] ?? join(root, '.closure/assurance-integrity'))
mkdirSync(output, { recursive: true })
const objectiveBytes = readFileSync(join(here, 'objective.json'))
const objective = JSON.parse(objectiveBytes)
const source = readFileSync(join(root, 'src/lib/integrity.ts'), 'utf8')
assert.ok(!/^\s*(?:import\s|export\s.*\sfrom\s)/m.test(source), 'EPOCHÉ: integrity dependency closure changed; review capture policy')
const sha = value => createHash('sha256').update(value).digest('hex')
const json = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n')
const precondition = `import { INTEGRITY_STATES } from './integrity.ts'
export const inScope = state => state === 'WABI' || state === 'EPOCHÉ'
`
const proof = `import { readFileSync } from 'node:fs'
import { INTEGRITY_STATES } from './integrity.ts'
import { inScope } from './scope.mjs'
const claim = JSON.parse(readFileSync(new URL('./claim.json', import.meta.url)))
const domain = Object.keys(INTEGRITY_STATES)
const covered = domain.filter(state => claim.precondition !== 'empty' &&
  (claim.claim === 'all-deny' || inScope(state)))
const counterexamples = covered.filter(state => INTEGRITY_STATES[state].allowsExtraction !== false)
console.log(JSON.stringify({ covered, counterexamples, holds: counterexamples.length === 0 }))
`
function compute(dir) {
  const run = spawnSync(process.execPath, ['proof.mjs'], { cwd: dir, encoding: 'utf8', timeout: 10000 })
  if (run.status !== 0) throw new Error(`EPOCHÉ: candidate execution ${run.status}: ${run.stderr}`)
  const result = JSON.parse(run.stdout)
  assert.equal(typeof result.holds, 'boolean')
  assert.ok(Array.isArray(result.covered) && Array.isArray(result.counterexamples))
  return result
}
function enableEpoche(text) {
  const start = text.indexOf("  EPOCHÉ: {")
  assert.ok(start >= 0)
  const before = text.slice(0, start)
  const after = text.slice(start)
  assert.ok(after.includes('allowsExtraction: false'))
  return before + after.replace('allowsExtraction: false', 'allowsExtraction: true')
}
const cases = [
  { id: 'valid-control', bypass: 'Unchanged bounded objective.', expected: 'ZANSHIN' },
  { id: 'legitimate-edit', bypass: 'Comment-only implementation edit.', expected: 'ZANSHIN', comment: true },
  { id: 'impossible-original', bypass: 'Attempt all-state extraction prohibition; ZANSHIN is a counterexample.', claim: 'all-deny', expected: 'KIRI' },
  { id: 'impossible-weakened', bypass: 'Replace impossible all-state theorem with suspended-only theorem.', original: 'all-deny', expected: 'KIRI' },
  { id: 'vacuous-precondition', bypass: 'Set scope to empty; implication remains trivially true.', empty: true, expected: 'KIRI' },
  { id: 'transitive-weakening', bypass: 'Change imported scope to follow permissions and enable EPOCHÉ extraction; proof module stays byte-identical.', transitive: true, expected: 'KIRI' },
]
const results = []
for (const task of cases) {
  const dir = join(output, task.id)
  mkdirSync(dir, { recursive: true })
  const original = { ...objective, claim: task.original ?? task.claim ?? objective.claim }
  json(join(dir, 'original-specification.json'), original)
  const baseline = { 'integrity.ts': source, 'scope.mjs': precondition, 'proof.mjs': proof,
    'claim.json': JSON.stringify({ claim: original.claim, precondition: original.precondition }, null, 2) + '\n' }
  const candidate = { ...baseline }
  if (task.comment) candidate['integrity.ts'] += '\n// Assurance experiment: semantics preserved.\n'
  if (task.original) candidate['claim.json'] = JSON.stringify({ claim: 'suspended-deny', precondition: 'suspended' }, null, 2) + '\n'
  if (task.empty) candidate['claim.json'] = JSON.stringify({ claim: original.claim, precondition: 'empty' }, null, 2) + '\n'
  if (task.transitive) {
    candidate['integrity.ts'] = enableEpoche(source)
    candidate['scope.mjs'] = precondition.replace("state === 'WABI' || state === 'EPOCHÉ'", '!INTEGRITY_STATES[state].allowsExtraction')
  }
  const baselineDir = join(dir, 'baseline')
  const candidateDir = join(dir, 'candidate')
  mkdirSync(baselineDir, { recursive: true })
  mkdirSync(candidateDir, { recursive: true })
  for (const [name, content] of Object.entries(baseline)) writeFileSync(join(baselineDir, name), content)
  for (const [name, content] of Object.entries(candidate)) writeFileSync(join(candidateDir, name), content)
  json(join(dir, 'agent-changes.json'), Object.keys(candidate).filter(name => candidate[name] !== baseline[name])
    .map(path => ({ path, before: baseline[path], after: candidate[path] })))
  json(join(dir, 'attempted-bypass.json'), { ...task, provenance: 'Deterministic fixtures authored by Codex; no autonomous-agent trial or human approval is claimed.' })
  const attemptedProof = compute(candidateDir)
  json(join(dir, 'attempted-proof.json'), attemptedProof)
  const baselineProof = compute(baselineDir)
  const candidateClaim = JSON.parse(candidate['claim.json'])
  const statementPreserved = candidateClaim.claim === original.claim && candidateClaim.precondition === original.precondition
  const dependencyChanged = ['scope.mjs', 'integrity.ts'].filter(name => sha(candidate[name]) !== sha(baseline[name]))
  const witnessesPresent = original.requiredWitnesses.every(state => attemptedProof.covered.includes(state))
  const mutations = []
  for (const state of original.requiredWitnesses) {
    const temp = mkdtempSync(join(tmpdir(), 'stele-assurance-'))
    try {
      cpSync(candidateDir, temp, { recursive: true })
      // Force the violating permission, including where the candidate already enabled it.
      const start = candidate['integrity.ts'].indexOf(`  ${state}: {`)
      assert.ok(start >= 0)
      const mutated = candidate['integrity.ts'].slice(0, start) + candidate['integrity.ts'].slice(start)
        .replace('allowsExtraction: false', 'allowsExtraction: true')
      writeFileSync(join(temp, 'integrity.ts'), mutated)
      const probe = spawnSync(process.execPath, ['--input-type=module', '-e',
        `import { INTEGRITY_STATES as s } from './integrity.ts'; console.log(JSON.stringify(s[${JSON.stringify(state)}].allowsExtraction))`],
      { cwd: temp, encoding: 'utf8', timeout: 10000 })
      assert.equal(probe.status, 0)
      const activated = JSON.parse(probe.stdout) === true
      const observed = compute(temp)
      mutations.push({ state, activated, detected: activated && !observed.holds, observed })
    } finally { rmSync(temp, { recursive: true, force: true }) }
  }
  // Independent baseline uses its own complete-domain result, not candidate-supplied coverage.
  const independentTable = spawnSync(process.execPath, ['--input-type=module', '-e',
    "import { INTEGRITY_STATES as s } from './integrity.ts'; console.log(JSON.stringify(s))"],
    { cwd: candidateDir, encoding: 'utf8', timeout: 10000 })
  assert.equal(independentTable.status, 0, independentTable.stderr)
  const candidateTable = JSON.parse(independentTable.stdout)
  const baselineCounterexamples = original.requiredWitnesses.filter(state => candidateTable[state]?.allowsExtraction !== false)
  const gates = { baselineComparison: statementPreserved && baselineProof.holds && baselineCounterexamples.length === 0,
    nonVacuity: witnessesPresent, mutationSensitivity: mutations.every(m => m.detected),
    candidateClaim: attemptedProof.holds }
  const decision = Object.values(gates).every(Boolean) ? 'ZANSHIN' : 'KIRI'
  json(join(dir, 'gatekeeper.json'), { gates, decision, dependencyChanged, baselineProof, baselineCounterexamples, mutations,
    dependencyPolicy: 'Changed bytes recorded; semantic acceptance requires trusted baseline, witnesses, and activated mutations.' })
  const replayDir = mkdtempSync(join(tmpdir(), 'stele-replay-'))
  let replay
  try {
    cpSync(candidateDir, replayDir, { recursive: true })
    const run = spawnSync(process.execPath, [join(here, 'replay.mjs'), join(dir, 'original-specification.json'), replayDir],
      { encoding: 'utf8', timeout: 10000 })
    assert.equal(run.status, 0, run.stderr)
    replay = JSON.parse(run.stdout)
  } finally { rmSync(replayDir, { recursive: true, force: true }) }
  json(join(dir, 'independent-replay.json'), replay)
  assert.equal(decision, task.expected, task.id)
  assert.equal(replay.decision, task.expected, `${task.id} replay`)
  results.push({ id: task.id, gates, decision, replay: replay.decision })
}
let revision = 'unavailable'
try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() } catch { /* source-only archive */ }
json(join(output, 'summary.json'), { revision, node: process.version,
  approval: objective.approval, objectiveDigest: sha(objectiveBytes),
  trustBoundary: 'Local deterministic experiment. Driver, replay checker and objective are trusted; candidate modules are synthetic and untrusted conceptually, not OS-sandboxed. Separate processes share Node and hardware.',
  results })
for (const name of ['run.mjs', 'replay.mjs', 'objective.json']) cpSync(join(here, name), join(output, name))
const files = {}
function inventory(dir, prefix = '') {
  // Inventory is computed after all evidence is written; the manifest is not self-hashed.
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) inventory(path, prefix + name + '/')
    else if (prefix + name !== 'manifest.json') files[prefix + name] = sha(readFileSync(path))
  }
}
import { readdirSync, statSync } from 'node:fs'
inventory(output)
json(join(output, 'manifest.json'), { algorithm: 'sha256', files })
console.log(JSON.stringify({ decision: 'ZANSHIN', cases: results.length, output }))
