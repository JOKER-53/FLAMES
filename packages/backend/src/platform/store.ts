import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID, createHash } from "node:crypto";

// Node 22.13+ provides SQLite without a native third-party dependency.
interface Statement {
  run(...params: (string | number | null)[]): unknown;
  get(...params: (string | number)[]): Record<string, unknown> | undefined;
  all(...params: (string | number)[]): Record<string, unknown>[];
}
interface Database {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  close(): void;
}
const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (path: string) => Database };

export interface User {
  id: string;
  email: string;
  name: string;
  role: "student" | "instructor";
}
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export class PlatformStore {
  private db: Database;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student','instructor')), password TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS progress (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform TEXT NOT NULL CHECK(platform IN ('fortigate','paloalto')),
        task_id TEXT NOT NULL, updated_at INTEGER NOT NULL,
        PRIMARY KEY(user_id,platform,task_id)
      );`);
  }
  close() { this.db.close(); }
  private user(row: Record<string, unknown>): User {
    return { id: String(row.id), email: String(row.email), name: String(row.name), role: row.role as User["role"] };
  }
  findEmail(email: string): { user: User; password: string } | undefined {
    const row = this.db.prepare("SELECT * FROM users WHERE email=?").get(email);
    return row ? { user: this.user(row), password: String(row.password) } : undefined;
  }
  createUser(email: string, name: string, password: string, role: User["role"] = "student"): User {
    const user = { id: randomUUID(), email, name, role };
    this.db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?)").run(user.id, email, name, role, password, Date.now());
    return user;
  }
  createSession(userId: string, token: string, expiresAt: number) {
    this.db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(Date.now());
    this.db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(tokenHash(token), userId, expiresAt);
  }
  session(token: string): User | undefined {
    const row = this.db.prepare(`SELECT users.* FROM users JOIN sessions ON sessions.user_id=users.id
      WHERE sessions.hash=? AND sessions.expires_at>?`).get(tokenHash(token), Date.now());
    return row ? this.user(row) : undefined;
  }
  revoke(token: string) { this.db.prepare("DELETE FROM sessions WHERE hash=?").run(tokenHash(token)); }
  progress(userId: string, platform: string): string[] {
    return this.db.prepare("SELECT task_id FROM progress WHERE user_id=? AND platform=? ORDER BY task_id")
      .all(userId, platform).map(row => String(row.task_id));
  }
  mergeProgress(userId: string, platform: string, ids: string[]) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const statement = this.db.prepare("INSERT OR IGNORE INTO progress VALUES (?,?,?,?)");
      for (const id of ids) statement.run(userId, platform, id, Date.now());
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
    return this.progress(userId, platform);
  }
  roster() {
    return this.db.prepare("SELECT id,email,name,role FROM users WHERE role='student' ORDER BY name").all().map(row => {
      const user = this.user(row);
      return { ...user, fortigate: this.progress(user.id, "fortigate"), paloalto: this.progress(user.id, "paloalto") };
    });
  }
}
