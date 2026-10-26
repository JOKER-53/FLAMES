#!/usr/bin/env node
// Consistent per-database SQLite snapshots, including committed WAL contents.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
function verify(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const rows = db.prepare('PRAGMA integrity_check').all();
    if (rows.length !== 1 || Object.values(rows[0])[0] !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Database integrity check failed.');
  } finally { db.close(); }
}
function main() {
  const command = process.argv[2];
  if (command === '--help' || !command) {
    console.log('Backup: node scripts/data-backup.cjs backup --source-dir DIR --output NEW_DIR\nRestore: node scripts/data-backup.cjs restore --backup DIR --target-dir NEW_DIR\nUse maintenance mode for a coordinated cross-database snapshot. Restore never overwrites existing directories. Backups contain private account data and answer keys.'); return;
  }
  if (command === 'backup') {
    const source = arg('--source-dir'), output = arg('--output');
    if (!source || !output) throw new Error('Specify --source-dir and --output.');
    if (fs.existsSync(output)) throw new Error('Output directory already exists. Choose a new directory.');
    const files = ['fortisim.sqlite', 'content.sqlite'].filter(name => fs.existsSync(path.join(source, name)));
    if (!files.includes('content.sqlite')) throw new Error('Source must contain content.sqlite. Academy account/progress data is backed up separately in MySQL.');
    fs.mkdirSync(output, { recursive: true, mode: 0o700 });
    try {
      const manifest = { format: 'flames-backup', version: 1, createdAt: new Date().toISOString(), gitRevision: process.env.FLAMES_RELEASE || null, files: [] };
      for (const name of files) {
        const db = new DatabaseSync(path.resolve(source, name), { readOnly: true });
        const destination = path.resolve(output, name);
        try { db.prepare('VACUUM INTO ?').run(destination); } finally { db.close(); }
        fs.chmodSync(destination, 0o600); verify(destination);
        manifest.files.push({ name, sha256: digest(destination) });
      }
      fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 });
      console.log(`Verified ${files.length} database snapshots in ${path.resolve(output)}`);
    } catch (error) { fs.rmSync(output, { recursive: true, force: true }); throw error; }
  } else if (command === 'restore') {
    const backup = arg('--backup'), target = arg('--target-dir');
    if (!backup || !target) throw new Error('Specify --backup and --target-dir.');
    if (fs.existsSync(target)) throw new Error('Target directory exists. Restore into a new directory, then switch volumes during maintenance.');
    const manifest = JSON.parse(fs.readFileSync(path.join(backup, 'manifest.json'), 'utf8'));
    if (manifest.format !== 'flames-backup' || manifest.version !== 1 || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > 2 || new Set(manifest.files.map(x => x.name)).size !== manifest.files.length || !manifest.files.some(x => x.name === 'content.sqlite')) throw new Error('Unsupported backup manifest.');
    for (const file of manifest.files) {
      if (!['fortisim.sqlite', 'content.sqlite'].includes(file.name) || !/^[a-f0-9]{64}$/.test(file.sha256) || digest(path.join(backup, file.name)) !== file.sha256) throw new Error('Backup checksum or filename validation failed.');
      verify(path.join(backup, file.name));
    }
    fs.mkdirSync(target, { recursive: true, mode: 0o700 });
    try {
      for (const file of manifest.files) fs.copyFileSync(path.join(backup, file.name), path.join(target, file.name), fs.constants.COPYFILE_EXCL);
      for (const file of manifest.files) fs.chmodSync(path.join(target, file.name), 0o600);
      console.log(`Restored verified databases to ${path.resolve(target)}. Existing deployment data was not modified.`);
    } catch (error) { fs.rmSync(target, { recursive: true, force: true }); throw error; }
  } else throw new Error('Use backup, restore, or --help.');
}
if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { verify };
