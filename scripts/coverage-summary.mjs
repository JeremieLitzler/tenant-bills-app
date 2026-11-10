// Prints the coverage/coverage-summary.json totals and per-file rows as a Markdown table.
// Used by the pull request workflow: `node scripts/coverage-summary.mjs >> "$GITHUB_STEP_SUMMARY"`.
import { existsSync, readFileSync } from 'node:fs'
import { relative } from 'node:path'

const file = 'coverage/coverage-summary.json'

if (!existsSync(file)) {
  console.log('## Coverage\n\nNo coverage report was produced.')
  process.exit(0)
}

const summary = JSON.parse(readFileSync(file, 'utf8'))
const pct = (metric) => `${metric.pct}% (${metric.covered}/${metric.total})`
const row = (name, entry) =>
  `| ${name} | ${pct(entry.statements)} | ${pct(entry.branches)} | ${pct(entry.functions)} | ${pct(entry.lines)} |`

const lines = [
  '## Coverage',
  '',
  '| File | Statements | Branches | Functions | Lines |',
  '| --- | --- | --- | --- | --- |',
  row('**All files**', summary.total),
]
for (const [path, entry] of Object.entries(summary)) {
  if (path !== 'total') lines.push(row(relative(process.cwd(), path).replaceAll('\\', '/'), entry))
}
console.log(lines.join('\n'))
