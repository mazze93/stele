import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createEvidenceWriter } from './evidence.mjs'

function fixture(t) {
  const parent = mkdtempSync(join(tmpdir(), 'stele-evidence-test-'))
  t.after(() => rmSync(parent, { recursive: true, force: true }))
  return { parent, output: join(parent, 'run') }
}

test('manifest binds emitted bytes without reopening replaced paths or following extra symlinks', t => {
  const { parent, output } = fixture(t)
  const writer = createEvidenceWriter(output)
  writer.write('record.json', 'original evidence')
  const outside = join(parent, 'outside')
  writeFileSync(outside, 'external marker')
  rmSync(join(output, 'record.json'))
  symlinkSync(outside, join(output, 'record.json'))
  symlinkSync(parent, join(output, 'extra-directory'))
  writer.finalize()
  const manifest = JSON.parse(readFileSync(join(output, 'manifest.json')))
  assert.deepEqual(Object.keys(manifest.files), ['record.json'])
  assert.equal(manifest.files['record.json'], createHash('sha256').update('original evidence').digest('hex'))
  // A later verifier detects replacement; finalization cannot bless external bytes.
  assert.notEqual(manifest.files['record.json'], createHash('sha256').update(readFileSync(join(output, 'record.json'))).digest('hex'))
  assert.equal(readFileSync(outside, 'utf8'), 'external marker')
})

test('exclusive writes reject planted file and manifest symlinks without modifying targets', t => {
  const { parent, output } = fixture(t)
  const writer = createEvidenceWriter(output)
  const outside = join(parent, 'outside')
  writeFileSync(outside, 'external marker')
  symlinkSync(outside, join(output, 'record.json'))
  assert.throws(() => writer.write('record.json', 'replacement'), { code: 'EEXIST' })
  symlinkSync(outside, join(output, 'manifest.json'))
  assert.throws(() => writer.finalize(), { code: 'EEXIST' })
  assert.equal(readFileSync(outside, 'utf8'), 'external marker')
})

test('existing output and directory symlinks are rejected before any evidence writes', t => {
  const { parent, output } = fixture(t)
  mkdirSync(output)
  writeFileSync(join(output, 'marker'), 'preserve')
  assert.throws(() => createEvidenceWriter(output), { code: 'EEXIST' })
  const link = join(parent, 'link')
  symlinkSync(output, link)
  assert.throws(() => createEvidenceWriter(link), { code: 'EEXIST' })
  assert.equal(readFileSync(join(output, 'marker'), 'utf8'), 'preserve')
})

test('concurrent writers to one run directory have exactly one owner', async t => {
  const { output } = fixture(t)
  const code = `import { createEvidenceWriter } from ${JSON.stringify(import.meta.resolve('./evidence.mjs'))};
    const writer = createEvidenceWriter(process.argv[1]); writer.write('record.json', process.argv[2]); writer.finalize()`
  const run = value => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', code, output, value], { stdio: 'ignore' })
    child.on('error', reject)
    child.on('close', resolve)
  })
  const results = await Promise.all([run('one'), run('two')])
  assert.equal(results.filter(code => code === 0).length, 1)
  const manifest = JSON.parse(readFileSync(join(output, 'manifest.json')))
  assert.equal(manifest.files['record.json'], createHash('sha256').update(readFileSync(join(output, 'record.json'))).digest('hex'))
})

test('ordinary nested evidence remains verifiable and cannot be overwritten', t => {
  const { output } = fixture(t)
  const writer = createEvidenceWriter(output)
  mkdirSync(join(output, 'case'))
  writer.write('case/result.json', '{"decision":"ZANSHIN"}')
  assert.throws(() => writer.write('case/result.json', 'replacement'), { code: 'EEXIST' })
  assert.throws(() => writer.write('../outside', 'escape'), /leaves the run directory/)
  writer.finalize()
  const manifest = JSON.parse(readFileSync(join(output, 'manifest.json')))
  assert.equal(manifest.files['case/result.json'], createHash('sha256').update(readFileSync(join(output, 'case/result.json'))).digest('hex'))
})
