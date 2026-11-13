// Separately implemented checker. Never imports the candidate's proof or predicate.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const [baselinePath, candidatePath] = process.argv.slice(2)
const baseline = JSON.parse(readFileSync(resolve(baselinePath), 'utf8'))
const candidate = JSON.parse(readFileSync(resolve(candidatePath, 'claim.json'), 'utf8'))
const { INTEGRITY_STATES } = await import(pathToFileURL(resolve(candidatePath, 'integrity.ts')))
const digest = value => createHash('sha256').update(value).digest('hex')
const differences = []
for (const key of ['claim', 'precondition']) {
  if (candidate[key] !== baseline[key]) differences.push(key)
}
const counterexamples = baseline.requiredWitnesses.filter(state =>
  INTEGRITY_STATES[state]?.allowsExtraction !== false)
// An all-state prohibition is false on the approved domain as well.
if (candidate.claim === 'all-deny') {
  for (const state of baseline.states) {
    if (INTEGRITY_STATES[state]?.allowsExtraction !== false && !counterexamples.includes(state)) {
      counterexamples.push(state)
    }
  }
}
const result = {
  objectiveDigest: digest(readFileSync(resolve(baselinePath))),
  statementDifferences: differences,
  counterexamples,
  decision: differences.length || counterexamples.length ? 'KIRI' : 'ZANSHIN',
}
process.stdout.write(JSON.stringify(result) + '\n')
