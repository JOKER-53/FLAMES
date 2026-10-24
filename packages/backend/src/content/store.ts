import { validatePolicyExercise, policyScenario } from "./policyExercise";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { AuthoredModule, AuthoredLesson, ContentDraft, ContentSummary, CatalogModule, PublicLesson } from "@fortisim/engine";
const { DatabaseSync } = require("node:sqlite");

export class ContentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const requireValue = (valid: boolean, message: string) => { if (!valid) throw new ContentError(400, message); };
const text = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max;
const identifier = (value: unknown, prefix: string) => typeof value === "string" && new RegExp(`^${prefix}-[a-f0-9-]{36}$`).test(value);

export function validateModule(value: unknown, publishing = false): AuthoredModule {
  requireValue(!!value && typeof value === "object" && !Array.isArray(value), "Module must be an object.");
  const module = value as AuthoredModule;
  requireValue(identifier(module.id, "module"), "Invalid module ID.");
  requireValue(["fortigate", "paloalto"].includes(module.vendor), "Choose a valid vendor.");
  requireValue(text(module.title, 160) && !!module.title.trim(), "Enter a module title of up to 160 characters.");
  requireValue(text(module.summary, 1000), "Module summary must be up to 1,000 characters.");
  requireValue(Array.isArray(module.lessons) && module.lessons.length <= 30, "A module supports up to 30 lessons.");
  requireValue(!publishing || module.lessons.length > 0, "Add at least one lesson before publishing.");
  const ids = new Set<string>();
  for (const lesson of module.lessons) {
    requireValue(!!lesson && typeof lesson === "object" && identifier(lesson.id, "custom") && !ids.has(lesson.id), "Every lesson needs a unique valid ID."); ids.add(lesson.id);
    requireValue(lesson.kind === undefined || ["reading", "policy"].includes(lesson.kind), "Invalid lesson kind.");
    requireValue(lesson.kind !== "policy" || module.vendor === "fortigate", "Policy simulator lessons belong to FortiGate.");
    requireValue(text(lesson.title, 160) && (!publishing || !!lesson.title.trim()), "Every published lesson needs a title.");
    requireValue(text(lesson.summary, 1000) && text(lesson.body, 30000), "Lesson instructions or summary are too long.");
    requireValue(!publishing || !!lesson.body.trim(), `Add instructions to ${lesson.title || "the lesson"}.`);
    requireValue(Number.isInteger(lesson.minutes) && lesson.minutes >= 1 && lesson.minutes <= 240, "Lesson duration must be 1–240 minutes.");
    requireValue(["Foundation", "Intermediate", "Advanced"].includes(lesson.level), "Choose a valid lesson level.");
    requireValue(Array.isArray(lesson.tasks) && lesson.tasks.length <= 20, "A lesson supports up to 20 tasks.");
    requireValue(lesson.kind !== "policy" || lesson.tasks.length === 0, "Policy exercises use packet checks; add question tasks in a separate reading lesson.");
    if (lesson.kind === "policy") {
      try { validatePolicyExercise(lesson.policyExercise, publishing); }
      catch (error) { throw new ContentError(400, error instanceof Error ? error.message : "Invalid exercise."); }
    }
    for (const task of lesson.tasks) {
      requireValue(!!task && typeof task === "object" && identifier(task.id, "task") && !ids.has(task.id), "Every task needs a unique valid ID."); ids.add(task.id);
      requireValue(["choice", "answer"].includes(task.type) && text(task.prompt, 2000), "Invalid task type or question.");
      requireValue(!publishing || !!task.prompt.trim(), "Enter a question for every published task.");
      requireValue(Array.isArray(task.choices) && task.choices.length <= 8 && task.choices.every(choice => text(choice, 500)), "Tasks support up to eight answer choices.");
      requireValue(Number.isInteger(task.correctIndex) && task.correctIndex >= -1 && task.correctIndex < 8, "Choose a valid correct answer.");
      requireValue(Array.isArray(task.acceptedAnswers) && task.acceptedAnswers.length <= 10 && task.acceptedAnswers.every(answer => text(answer, 500)), "Tasks support up to ten accepted answers.");
      if (publishing && task.type === "choice") {
        requireValue(task.choices.length >= 2 && task.choices.every(choice => !!choice.trim()) && new Set(task.choices.map(choice => choice.trim().toLowerCase())).size === task.choices.length, "Add at least two distinct, nonempty choices.");
        requireValue(task.correctIndex >= 0 && task.correctIndex < task.choices.length, "Select the correct choice for every question.");
      }
      if (publishing && task.type === "answer") requireValue(task.acceptedAnswers.some(answer => !!answer.trim()), "Enter an accepted answer for every short-answer task.");
    }
  }
  requireValue(JSON.stringify(value).length <= 200000, "Module content exceeds the size limit. Split it into smaller modules.");
  // Copy only supported fields; discard any extra caller-supplied properties.
  return { id: module.id, vendor: module.vendor, title: module.title.trim(), summary: module.summary.trim(), lessons: module.lessons.map(lesson => ({
    kind: lesson.kind ?? "reading", ...(lesson.kind === "policy" ? { policyExercise: lesson.policyExercise } : {}),
    id: lesson.id, title: lesson.title.trim(), summary: lesson.summary.trim(), minutes: lesson.minutes, level: lesson.level, body: lesson.body,
    tasks: lesson.tasks.map(task => ({ id: task.id, type: task.type, prompt: task.prompt, choices: [...task.choices], correctIndex: task.correctIndex, acceptedAnswers: [...task.acceptedAnswers] })),
  })) };
}

export class ContentStore {
  readonly db: any;
  private cachedCatalog: CatalogModule[] | null = null;
  private catalogVersion = -1;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS content_modules (
        id TEXT PRIMARY KEY, draft_json TEXT NOT NULL, published_json TEXT,
        revision INTEGER NOT NULL, updated_at INTEGER NOT NULL, published_at INTEGER
      );`);
  }
  close() { this.db.close(); }
  private write<T>(operation: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = operation(); this.db.exec("COMMIT"); return result; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  get(id: string): ContentDraft {
    const row = this.db.prepare("SELECT * FROM content_modules WHERE id=?").get(id);
    if (!row) throw new ContentError(404, "Module not found.");
    return { module: JSON.parse(row.draft_json), revision: row.revision, updatedAt: row.updated_at, publishedAt: row.published_at, hasUnpublishedChanges: row.draft_json !== row.published_json };
  }
  list(): ContentSummary[] {
    return this.db.prepare("SELECT id FROM content_modules ORDER BY updated_at DESC, id").all().map((row: { id: string }) => {
      const draft = this.get(row.id);
      return { id: row.id, title: draft.module.title, vendor: draft.module.vendor, lessonCount: draft.module.lessons.length, revision: draft.revision, publishedAt: draft.publishedAt, hasUnpublishedChanges: draft.hasUnpublishedChanges };
    });
  }
  create(vendor: unknown, title: unknown): ContentDraft {
    return this.write(() => {
    requireValue(this.list().length < 100, "Content library limit reached (100 modules).");
    const module = validateModule({ id: `module-${randomUUID()}`, vendor, title, summary: "", lessons: [] });
    this.db.prepare("INSERT INTO content_modules VALUES (?,?,NULL,1,?,NULL)").run(module.id, JSON.stringify(module), Date.now());
    return this.get(module.id);
      });
  }
  exportModule(id: string) {
    return { format: "flames-module", schemaVersion: 1, exportedAt: new Date().toISOString(), assets: "none", module: this.get(id).module };
  }
  previewImport(value: unknown) {
    const data = value as any;
    requireValue(data?.format === "flames-module" && data.schemaVersion === 1 && data.assets === "none", "Unsupported FLAMES module format, version, or assets. Use a self-contained version 1 export.");
    const module = validateModule(data.module);
    // Always mint new identities. Existing progress and published lessons are never reused.
    const remapped = { ...module, id: `module-${randomUUID()}`, lessons: module.lessons.map(lesson => ({ ...lesson, id: `custom-${randomUUID()}`, tasks: lesson.tasks.map(task => ({ ...task, id: `task-${randomUUID()}` })) })) };
    return { module: remapped, lessonCount: module.lessons.length, taskCount: module.lessons.reduce((sum, lesson) => sum + lesson.tasks.length, 0), warning: "Imports are private drafts with new IDs. No progress, uploads, or external assets are imported." };
  }
  importModule(value: unknown): ContentDraft {
    return this.write(() => {
    requireValue(this.list().length < 100, "Content library limit reached (100 modules).");
    const { module } = this.previewImport(value);
    this.db.prepare("INSERT INTO content_modules VALUES (?,?,NULL,1,?,NULL)").run(module.id, JSON.stringify(module), Date.now());
    return this.get(module.id);
      });
  }
  private revision(id: string, revision: unknown) {
    requireValue(Number.isInteger(revision), "A content revision is required.");
    const current = this.get(id);
    if (current.revision !== revision) throw new ContentError(409, "This module changed in another editor. Reload it before saving.");
    return current;
  }
  save(id: string, value: unknown, revision: unknown): ContentDraft {
    return this.write(() => {
    const current = this.revision(id, revision);
    const module = validateModule(value);
    requireValue(module.id === id && module.vendor === current.module.vendor, "Module identity and vendor cannot change.");
    const otherIds = new Set<string>();
    for (const other of this.list().filter(other => other.id !== id)) {
      const draft = this.get(other.id).module;
      for (const lesson of draft.lessons) otherIds.add(lesson.id);
      const published = this.db.prepare("SELECT published_json FROM content_modules WHERE id=?").get(other.id)?.published_json;
      if (published) for (const lesson of (JSON.parse(published) as AuthoredModule).lessons) otherIds.add(lesson.id);
    }
    requireValue(module.lessons.every(lesson => !otherIds.has(lesson.id)), "A lesson ID already belongs to another module.");
    this.db.prepare("UPDATE content_modules SET draft_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?").run(JSON.stringify(module), Date.now(), id, revision);
    return this.get(id);
      });
  }
  publish(id: string, revision: unknown): ContentDraft {
    return this.write(() => {
    const current = this.revision(id, revision);
    validateModule(current.module, true);
    const now = Date.now();
    this.db.prepare("UPDATE content_modules SET published_json=draft_json,published_at=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?").run(now, now, id, revision);
    this.cachedCatalog = null; return this.get(id);
      });
  }
  unpublish(id: string, revision: unknown): ContentDraft {
    return this.write(() => {
    this.revision(id, revision);
    this.db.prepare("UPDATE content_modules SET published_json=NULL,published_at=NULL,revision=revision+1,updated_at=? WHERE id=? AND revision=?").run(Date.now(), id, revision);
    this.cachedCatalog = null; return this.get(id);
      });
  }
  delete(id: string, revision: unknown) {
    return this.write(() => {
    const current = this.revision(id, revision);
    if (current.publishedAt) throw new ContentError(409, "Unpublish the module before deleting it.");
    this.db.prepare("DELETE FROM content_modules WHERE id=? AND revision=?").run(id, revision); this.cachedCatalog = null;
      });
  }
  catalog(): CatalogModule[] {
    const version = Number(this.db.prepare("PRAGMA data_version").get().data_version);
    if (this.cachedCatalog && this.catalogVersion === version) return this.cachedCatalog;
    this.catalogVersion = version;
    const rows = this.db.prepare("SELECT published_json FROM content_modules WHERE published_json IS NOT NULL ORDER BY published_at,id").all();
    this.cachedCatalog = rows.map((row: { published_json: string }) => {
      const module = JSON.parse(row.published_json) as AuthoredModule;
      return { id: module.id, vendor: module.vendor, title: module.title, summary: module.summary, lessons: module.lessons.map(lesson => ({ id: lesson.id, title: lesson.title, summary: lesson.summary, minutes: lesson.minutes, level: lesson.level, kind: lesson.kind ?? "reading", ...(lesson.kind === "policy" && lesson.policyExercise ? { scenarioVersion: createHash("sha256").update(JSON.stringify(lesson.policyExercise)).digest("hex").slice(0, 24) } : {}) })) };
    });
    return this.cachedCatalog!;
  }
  isPublishedLesson(vendor: string, id: unknown): id is string {
    return typeof id === "string" && this.catalog().some(module => module.vendor === vendor && module.lessons.some(lesson => lesson.id === id));
  }
  private lesson(id: string): { lesson: AuthoredLesson; module: AuthoredModule } {
    for (const row of this.db.prepare("SELECT published_json FROM content_modules WHERE published_json IS NOT NULL").all()) {
      const module = JSON.parse(row.published_json) as AuthoredModule;
      const lesson = module.lessons.find(lesson => lesson.id === id);
      if (lesson) return { lesson, module };
    }
    throw new ContentError(404, "This lesson is not published.");
  }
  publicLesson(id: string): PublicLesson {
    const { lesson, module } = this.lesson(id);
    return { id: lesson.id, title: lesson.title, summary: lesson.summary, minutes: lesson.minutes, level: lesson.level, body: lesson.body, kind: lesson.kind ?? "reading", moduleId: module.id, vendor: module.vendor, tasks: lesson.tasks.map(({ id, type, prompt, choices }) => ({ id, type, prompt, choices: type === "choice" ? choices : [] })) };
  }
  policyExercise(id: string) {
    let item;
    try { item = this.lesson(id); } catch (error) { if (error instanceof ContentError && error.status === 404) return null; throw error; }
    const { lesson } = item;
    if (lesson.kind !== "policy" || !lesson.policyExercise) return null;
    return {
      scenario: policyScenario(lesson.id, lesson.title, lesson.body, lesson.policyExercise),
      starterPolicies: lesson.policyExercise.starterPolicies,
      version: createHash("sha256").update(JSON.stringify(lesson.policyExercise)).digest("hex").slice(0, 24),
    };
  }
  grade(id: string, answers: unknown) {
    const { lesson } = this.lesson(id);
    requireValue(lesson.kind !== "policy", "Use the simulator grading endpoint for this lesson.");
    requireValue(Array.isArray(answers) && answers.length <= 20, "Submit a valid answer list.");
    const entries = answers as { taskId: string; value: unknown }[];
    requireValue(entries.every(answer => !!answer && typeof answer === "object" && lesson.tasks.some(task => task.id === answer.taskId) && (text(answer.value, 2000) || typeof answer.value === "number" && Number.isInteger(answer.value))), "Invalid task answer.");
    requireValue(new Set(entries.map(answer => answer.taskId)).size === entries.length, "Submit only one answer per task.");
    const normalize = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
    const results = lesson.tasks.map(task => {
      const value = entries.find(answer => answer.taskId === task.id)?.value;
      return { taskId: task.id, passed: task.type === "choice" ? value === task.correctIndex : typeof value === "string" && task.acceptedAnswers.some(answer => !!answer.trim() && normalize(answer) === normalize(value)) };
    });
    return { lessonId: id, overallPassed: results.every(result => result.passed), results };
  }
}
