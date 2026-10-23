#!/usr/bin/env node
// Import a replacement model without depending on the current working directory.
import { copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [source, name = 'pa-220-firewall.glb'] = process.argv.slice(2);
if (!source || !['pa-220-firewall.glb', 'firewall.glb'].includes(name)) {
  console.error('Usage: node scripts/import-model.mjs /path/to/model.glb [pa-220-firewall.glb|firewall.glb]');
  process.exit(1);
}
const input = resolve(source);
if (!existsSync(input)) {
  console.error('Model not found:', input);
  process.exit(1);
}
const destination = resolve(root, 'packages/frontend/public', name);
copyFileSync(input, destination);
console.log(`Imported model to ${destination}`);
