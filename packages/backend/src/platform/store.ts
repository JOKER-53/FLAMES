import { DraftError } from "../drafts/errors";
import type { SimulatorDraft } from "@fortisim/engine";
import { isCompletionTask as builtinCompletionTask } from "@fortisim/engine";
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
  private customCompletion: (platform: string, id: unknown) => boolean = () => false;
  setCompletionResolver(resolver: (platform: string, id: unknown) => boolean) { this.customCompletion = resolver; }
  isCompletionTask(platform: string, id: unknown): id is string {
    return typeof id === "string" && (builtinCompletionTask(platform, id) || this.customCompletion(platform, id));
  }
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
      CREATE TABLE IF NOT EXISTS simulator_drafts (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform TEXT NOT NULL, task_id TEXT NOT NULL, scenario_version TEXT NOT NULL,
        revision INTEGER NOT NULL, config_json TEXT, updated_at INTEGER NOT NULL,
        PRIMARY KEY(user_id,platform,task_id)
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
      .all(userId, platform).map(row => String(row.task_id)).filter(id => this.isCompletionTask(platform, id));
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
  simulatorDraft(userId: string, platform: string, taskId: string): SimulatorDraft | null {
    const row = this.db.prepare("SELECT * FROM simulator_drafts WHERE user_id=? AND platform=? AND task_id=?").get(userId, platform, taskId);
    return row ? { schemaVersion: 1, scenarioVersion: String(row.scenario_version), revision: Number(row.revision), config: row.config_json === null ? null : JSON.parse(String(row.config_json)), updatedAt: Number(row.updated_at) } : null;
  }
  saveSimulatorDraft(userId: string, platform: string, taskId: string, scenarioVersion: string, config: unknown | null, revision: number): SimulatorDraft {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const current = this.simulatorDraft(userId, platform, taskId);
      if ((current?.revision ?? 0) !== revision) throw new DraftError(409, "Another tab or device saved this draft. Reload the saved version before editing.", "revision-conflict");
      this.db.prepare(`INSERT INTO simulator_drafts VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(user_id,platform,task_id) DO UPDATE SET scenario_version=excluded.scenario_version,revision=excluded.revision,config_json=excluded.config_json,updated_at=excluded.updated_at`)
        .run(userId, platform, taskId, scenarioVersion, revision + 1, config === null ? null : JSON.stringify(config), Date.now());
      this.db.exec("COMMIT"); return this.simulatorDraft(userId, platform, taskId)!;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  rotateInstructorPassword(email: string, password: string) {
    const account = this.findEmail(email);
    if (!account || account.user.role !== "instructor") throw new Error("An existing instructor email is required.");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("UPDATE users SET password=? WHERE id=?").run(password, account.user.id);
      this.db.prepare("DELETE FROM sessions WHERE user_id=?").run(account.user.id);
      this.db.exec("COMMIT");
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  instructorPasswords(): string[] {
    return this.db.prepare("SELECT password FROM users WHERE role='instructor'").all().map(row => String(row.password));
  }
  roster() {
    return this.db.prepare("SELECT id,email,name,role FROM users WHERE role='student' ORDER BY name").all().map(row => {
      const user = this.user(row);
      return { ...user, fortigate: this.progress(user.id, "fortigate"), paloalto: this.progress(user.id, "paloalto") };
    });
  }
}
