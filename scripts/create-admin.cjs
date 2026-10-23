#!/usr/bin/env node
// Interactive first-instructor setup. Password input is hidden and never logged.
const { resolve } = require('node:path');
const { Writable } = require('node:stream');
const readline = require('node:readline/promises');
require('dotenv').config({ path: resolve('packages/backend/.env') });
const { PlatformStore } = require('../packages/backend/dist/platform/store');
const { hashPassword } = require('../packages/backend/dist/platform/auth');
async function main() {
  if (process.env.PLATFORM_MODE === 'academy') throw new Error('Use your Academy admin account in Academy mode. No local administrator is created.');
  if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal. Password input is hidden.');
  let hidden = false;
  const output = new Writable({ write(chunk, _encoding, done) { if (!hidden) process.stdout.write(chunk); done(); } });
  const prompt = readline.createInterface({ input: process.stdin, output, terminal: true });
  let store;
  try {
    const email = (await prompt.question('Administrator email: ')).trim().toLowerCase();
    const name = (await prompt.question('Display name: ')).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 80) throw new Error('Enter a valid email and a display name of up to 80 characters.');
    process.stdout.write('Password (12–128 characters): '); hidden = true;
    const password = await prompt.question(''); hidden = false; process.stdout.write('\n');
    process.stdout.write('Confirm password: '); hidden = true;
    const confirmation = await prompt.question(''); hidden = false; process.stdout.write('\n');
    if (password.length < 12 || password.length > 128 || password !== confirmation) throw new Error('Passwords must match and contain 12–128 characters.');
    store = new PlatformStore(process.env.DATABASE_PATH || resolve('packages/backend/data/fortisim.sqlite'));
    if (store.findEmail(email)) throw new Error('This account already exists. Existing accounts are not changed or promoted.');
    store.createUser(email, name, await hashPassword(password), 'instructor');
    process.stdout.write('FLAMES administrator created. Sign in at /account, then open /admin.\n');
  } finally { hidden = false; prompt.close(); store?.close(); }
}
if (process.argv.includes('--help')) console.log('FLAMES administrator setup: run npm run admin:create in an interactive terminal. The command asks for your email, display name, and a hidden password. In Academy mode use your Academy admin instead.');
else main().catch(error => { console.error(error.message); process.exitCode = 1; });
