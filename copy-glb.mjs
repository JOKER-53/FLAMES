#!/usr/bin/env node
// Run from the project root: node copy-glb.mjs
import { copyFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const src  = resolve(__dirname, 'pa-220-firewall.glb');
const dest = resolve(__dirname, 'packages/frontend/public/pa-220-firewall.glb');

if (!existsSync(src)) {
  console.error('❌  Source not found:', src);
  process.exit(1);
}

copyFileSync(src, dest);
console.log('✅  Copied pa-220-firewall.glb → packages/frontend/public/');
console.log('   Now restart the frontend: npm run frontend:dev');
