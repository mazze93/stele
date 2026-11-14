// Summarise Lighthouse JSON reports as a Markdown table for the CI job summary.
// Usage: node site/lighthouse-summary.mjs <label>=<report.json> ...
// Lab numbers from a local static server: comparable run to run, not field data.
import { readFile } from 'node:fs/promises'

const METRICS = [
  ['performance', r => Math.round(r.categories.performance.score * 100)],
  ['accessibility', r => Math.round(r.categories.accessibility.score * 100)],
  ['FCP ms', r => Math.round(r.audits['first-contentful-paint'].numericValue)],
  ['LCP ms', r => Math.round(r.audits['largest-contentful-paint'].numericValue)],
  ['CLS', r => r.audits['cumulative-layout-shift'].numericValue.toFixed(3)],
  ['TBT ms', r => Math.round(r.audits['total-blocking-time'].numericValue)],
  ['bytes', r => r.audits['total-byte-weight'].numericValue],
  ['requests', r => r.audits['network-requests'].details.items.length],
]

const rows = []
for (const arg of process.argv.slice(2)) {
  const eq = arg.indexOf('=')
  if (eq < 1) throw new Error(`Expected <label>=<report.json>, got ${arg}`)
  const report = JSON.parse(await readFile(arg.slice(eq + 1), 'utf8'))
  rows.push([arg.slice(0, eq), ...METRICS.map(([, read]) => read(report))])
}

console.log(`| run | ${METRICS.map(([name]) => name).join(' | ')} |`)
console.log(`|---|${METRICS.map(() => '---').join('|')}|`)
for (const row of rows) console.log(`| ${row.join(' | ')} |`)
