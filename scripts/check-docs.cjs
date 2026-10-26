#!/usr/bin/env node
// Validate file targets in maintained Markdown; archived reports retain historical paths.
const { readdirSync, readFileSync, existsSync } = require('node:fs');
const { resolve, join, relative, dirname } = require('node:path');
const root = resolve(__dirname, '..');
const files = [];
function walk(directory) {
 for (const entry of readdirSync(directory, { withFileTypes: true })) {
  if (['node_modules', 'dist', 'coverage', 'data', '.git', 'archive', 'test-results', 'playwright-report', '.backups', '.release'].includes(entry.name)) continue;
  const path = join(directory, entry.name);
  if (entry.isDirectory() && entry.name.startsWith('.') && entry.name !== '.github') continue;
  if (entry.isDirectory()) walk(path);
  else if (entry.name.endsWith('.md')) files.push(path);
 }
}
walk(root);
const failures = [];
for (const file of files) {
 const source = readFileSync(file, 'utf8').replace(/```[^\n]*\n[\s\S]*?```/g, '');
 for (const match of source.matchAll(/\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
  const href = match[1].replace(/^<|>$/g, '');
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) continue;
  let target;
  try { target = decodeURIComponent(href.split('#')[0]); }
  catch { failures.push(`${relative(root, file)}: invalid link ${href}`); continue; }
  if (!target) continue;
  if (!existsSync(resolve(dirname(file), target))) failures.push(`${relative(root, file)}: missing ${href}`);
 }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`Checked local links in ${files.length} maintained Markdown files. Archived report links are historical.`);
