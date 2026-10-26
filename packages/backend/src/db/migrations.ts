import { createHash } from "node:crypto";
export interface Migration { version:number; name:string; sql:string; }
export interface MigrationDatabase {exec(sql:string):void;prepare(sql:string):any;}
/** Append-only, checksummed migrations. Existing IF NOT EXISTS schemas are adopted without replacing data. */
export function migrate(db:MigrationDatabase, component:string, migrations:Migration[]) {
 db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (component TEXT NOT NULL, version INTEGER NOT NULL, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at INTEGER NOT NULL, PRIMARY KEY(component,version))");
 db.exec("BEGIN IMMEDIATE");
 try {
  const applied=db.prepare("SELECT * FROM schema_migrations WHERE component=? ORDER BY version").all(component);
  const versions=migrations.map(item=>item.version);
  if(new Set(versions).size!==versions.length||versions.some((version,index)=>version!==index+1))throw new Error(`Invalid migration sequence: ${component}`);
  for(const row of applied){const migration=migrations.find(item=>item.version===row.version);if(!migration)throw new Error(`Database ${component} is newer than this application. Use a matching release.`);if(row.checksum!==createHash("sha256").update(migration.sql).digest("hex"))throw new Error(`Migration checksum mismatch: ${component}/${row.version}`);}
  for(const migration of migrations)if(!applied.some((row:any)=>row.version===migration.version)){
   db.exec(migration.sql);db.prepare("INSERT INTO schema_migrations VALUES (?,?,?,?,?)").run(component,migration.version,migration.name,createHash("sha256").update(migration.sql).digest("hex"),Date.now());
  }
  db.exec("COMMIT");
 }catch(error){db.exec("ROLLBACK");throw error;}
}
export function schemaStatus(db:MigrationDatabase){return db.prepare("SELECT component,version,name,checksum,applied_at AS appliedAt FROM schema_migrations ORDER BY component,version").all();}
