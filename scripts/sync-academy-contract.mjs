#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../packages/engine/src/drafts.ts', import.meta.url), 'utf8')
  .replace('import { isCompletionTask } from "./completion";', 'import { LESSONS } from "./lesson-manifest.mjs"; const isCompletionTask = (platform: string, id: string) => Object.prototype.hasOwnProperty.call(LESSONS, platform) && LESSONS[platform as keyof typeof LESSONS].includes(id);');
const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } });
writeFileSync(new URL('../integrations/academy/simulator-contract.mjs', import.meta.url), '// Generated from engine/src/drafts.ts by scripts/sync-academy-contract.mjs.\n' + result.outputText);
console.log('Academy simulator draft contract synchronized.');
