// === MARKUP-SINK GATE — enforcement-boundary evidence ===
//
// eslint/markup-sinks.js is only a gate if the committed config actually
// fires. This suite lints planted sinks through the real eslint.config.js,
// with no overrides, so it fails when:
//   - an ESLint / esquery upgrade stops a selector from matching,
//   - a later config block replaces the no-restricted-* rules,
//   - the files glob stops covering a source tree, or
//   - an inline directive switches the rules off in a source file.
//
// The first version of this rule, written into a review document before it
// was ever run, missed 10 of the 14 sink shapes below, including React's own
// srcDoc spelling. That is why this suite exists.

import { describe, it, expect, beforeAll } from 'vitest'
import { ESLint } from 'eslint'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TAG = '[markup-sink]'
const PROBE_FILE = 'src/__markup_sink_probe__.tsx'

// --- fixtures: [name, code] — every one must parse as TSX ---
const MUST_FIRE: [string, string][] = [
  ['innerHTML assignment',        'export function f(el: HTMLElement, x: string) { el.innerHTML = x }'],
  ['innerHTML computed key',      "export function f(el: HTMLElement, x: string) { el['innerHTML'] = x }"],
  ['outerHTML assignment',        'export function f(el: HTMLElement, x: string) { el.outerHTML = x }'],
  ['insertAdjacentHTML',          "export function f(el: HTMLElement, x: string) { el.insertAdjacentHTML('beforeend', x) }"],
  ['document.write',              'export function f(x: string) { document.write(x) }'],
  ['document.writeln',            'export function f(x: string) { document.writeln(x) }'],
  ['contentDocument.write',       'export function f(fr: HTMLIFrameElement, x: string) { fr.contentDocument?.write(x) }'],
  ['createContextualFragment',    'export function f(x: string) { return document.createRange().createContextualFragment(x) }'],
  ['setHTMLUnsafe',               'export function f(el: { setHTMLUnsafe(h: string): void }, x: string) { el.setHTMLUnsafe(x) }'],
  ['dangerouslySetInnerHTML',     'export const C = ({ x }: { x: string }) => <div dangerouslySetInnerHTML={{ __html: x }} />'],
  ['JSX srcDoc (React spelling)', 'export const C = ({ x }: { x: string }) => <iframe title="t" srcDoc={x} />'],
  ['JSX srcdoc (DOM spelling)',   'export const C = ({ x }: { x: string }) => <iframe title="t" srcdoc={x} />'],
  ['createElement srcDoc prop',   "import { createElement } from 'react'\nexport const C = (x: string) => createElement('iframe', { srcDoc: x })"],
  ['Object.assign innerHTML',     'export function f(el: HTMLElement, x: string) { Object.assign(el, { innerHTML: x }) }'],
  ['iframe.srcdoc assignment',    'export function f(el: HTMLIFrameElement, x: string) { el.srcdoc = x }'],
  ['setAttribute srcdoc',         "export function f(el: HTMLElement, x: string) { el.setAttribute('srcdoc', x) }"],
]

const MUST_NOT_FIRE: [string, string][] = [
  ['textContent',                 'export function f(el: HTMLElement, x: string) { el.textContent = x }'],
  ['cross-origin iframe src',     'export const C = () => <iframe title="t" src="https://example.com" />'],
  ['JSX text interpolation',      'export const C = ({ x }: { x: string }) => <span>{x}</span>'],
  ['sink named in a string',      "export const STOP = 'innerHTML with untrusted input'"],
  ['sink named in a comment',     '// never use innerHTML or srcdoc here\nexport const a = 1'],
  ['unrelated setAttribute',      "export function f(el: HTMLElement, x: string) { el.setAttribute('title', x) }"],
  ['unrelated write()',           'export function f(s: { write(x: string): void }, x: string) { s.write(x) }'],
]

// --- helpers ---
let eslint: ESLint

async function sinkHits(code: string, file = PROBE_FILE): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath: join(ROOT, file) })
  const fatal = result.messages.find(m => m.fatal)
  if (fatal) throw new Error(`fixture did not parse (${file}): ${fatal.message}`)
  return result.messages.filter(m => m.message.includes(TAG)).length
}

const SCANNED_DIRS = ['src', 'evals', 'stele-core']
const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'generated'])

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return SKIPPED_DIRS.has(name) ? [] : sourceFiles(path)
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

// An inline directive defeats the gate if it names one of its rules, or
// names no rule at all (which switches every rule off). The text after
// `--` is a free-form reason and is not a rule list.
const DISABLE_DIRECTIVE = /(?:\/\/|\/\*)\s*eslint-disable(?:-next-line|-line)?\b([^\n]*)/g
const INLINE_RULE_CONFIG = /\/\*\s*eslint\s[^*]*no-restricted-(?:properties|syntax)/
const GATE_RULES = /no-restricted-(?:properties|syntax)/

function gateBypasses(source: string): string[] {
  const found: string[] = []
  for (const match of source.matchAll(DISABLE_DIRECTIVE)) {
    const ruleList = match[1].replace(/\*\/.*$/, '').split('--')[0].trim()
    if (ruleList === '' || GATE_RULES.test(ruleList)) found.push(match[0].trim())
  }
  const inline = source.match(INLINE_RULE_CONFIG)
  if (inline) found.push(inline[0].trim())
  return found
}

// --- the gate ---
describe('markup-sink gate fires through the committed eslint config', () => {
  beforeAll(async () => {
    eslint = new ESLint({ cwd: ROOT })
    await sinkHits('export const warm = 1') // first parse loads typescript-eslint
  }, 60_000)

  it.each(MUST_FIRE)('fires: %s', async (_name, code) => {
    expect(await sinkHits(code)).toBeGreaterThan(0)
  })

  it.each(MUST_NOT_FIRE)('stays quiet: %s', async (_name, code) => {
    expect(await sinkHits(code)).toBe(0)
  })

  it.each(['stele-core/src/__probe__.ts', 'evals/__probe__.ts', 'src/components/ui/__probe__.tsx'])(
    'covers %s',
    async file => {
      const code = 'export function f(el: { innerHTML: string }, x: string) { el.innerHTML = x }'
      expect(await sinkHits(code, file)).toBeGreaterThan(0)
    },
  )
})

describe('the markup-sink gate cannot be switched off inline', () => {
  it('detects the directive shapes it is meant to reject', () => {
    // Built by concatenation so the scan below never matches its own fixtures
    // (the failure recorded in DECISIONS.md, 2026-09-19: a source assertion
    // satisfied by its own text).
    const rule = 'no-restricted-' + 'syntax'
    const blanket = '/* eslint-' + 'disable */'
    expect(gateBypasses(`// eslint-disable-next-line ${rule}`)).toHaveLength(1)
    expect(gateBypasses(`/* eslint-disable ${rule} -- reason */`)).toHaveLength(1)
    expect(gateBypasses(blanket)).toHaveLength(1)
    expect(gateBypasses(`/* eslint ${rule}: "off" */`)).toHaveLength(1)
    expect(gateBypasses('// eslint-disable-next-line react-hooks/refs -- reason')).toHaveLength(0)
  })

  it('no source file carries a directive that disables it', () => {
    const offenders = SCANNED_DIRS
      .flatMap(dir => sourceFiles(join(ROOT, dir)))
      .flatMap(file => gateBypasses(readFileSync(file, 'utf8')).map(d => `${relative(ROOT, file)}: ${d}`))
    expect(offenders).toEqual([])
  })
})
