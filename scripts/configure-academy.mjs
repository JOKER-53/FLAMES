#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const input = process.argv[2];
let origin;
try {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error();
  origin = url.origin;
} catch {
  console.error('Usage: node scripts/configure-academy.mjs http[s]://academy-host:port');
  process.exit(1);
}
const source = readFileSync(fileURLToPath(new URL('../deploy/nginx.conf', import.meta.url)), 'utf8');
const output = source.replace('    add_header X-Frame-Options DENY always;\n', '')
  .replace("frame-ancestors 'none'", `frame-ancestors ${origin}`);
writeFileSync(fileURLToPath(new URL('../deploy/nginx.academy.conf', import.meta.url)),
  '# Academy embedding policy. Regenerate with scripts/configure-academy.mjs when ACADEMY_ORIGIN changes.\n' + output);
console.log(`Academy framing policy configured for ${origin}`);
