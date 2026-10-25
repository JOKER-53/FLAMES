import { migrate, schemaStatus } from "../db/migrations";
import { randomBytes, randomUUID } from "node:crypto";
import { ContentError } from "../content/store";
import type { User } from "../platform/store";
const check = (valid: unknown, message: string) => { if (!valid) throw new ContentError(400, message); };
export interface Assignment { id:string; title:string; vendor:string; moduleId:string; lessonIds:string[]; requiredCount:number; dueAt:number; }
export interface LearningGroup { id:string; name:string; inviteCode?:string; members:{id:string;name:string;email:string}[]; assignments:Assignment[]; }
export class ClassroomStore {
  constructor(private db: any, private scope: string) {
    migrate(db, "classroom", [{version:1,name:"Initial classroom schema",sql:`CREATE TABLE IF NOT EXISTS learning_groups (id TEXT PRIMARY KEY, scope TEXT NOT NULL, owner_id TEXT NOT NULL, name TEXT NOT NULL, invite TEXT UNIQUE NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS group_members (group_id TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, PRIMARY KEY(group_id,user_id));
      CREATE TABLE IF NOT EXISTS group_assignments (id TEXT PRIMARY KEY, group_id TEXT NOT NULL, title TEXT NOT NULL, vendor TEXT NOT NULL, module_id TEXT NOT NULL, lesson_ids TEXT NOT NULL, required_count INTEGER NOT NULL, due_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS assignment_starts (assignment_id TEXT NOT NULL, user_id TEXT NOT NULL, started_at INTEGER NOT NULL, PRIMARY KEY(assignment_id,user_id));`}]);
  }
  groups(user: User): LearningGroup[] {
    const rows = user.role === "instructor" ? this.db.prepare("SELECT * FROM learning_groups WHERE scope=? AND owner_id=? ORDER BY created_at,id").all(this.scope,user.id)
      : this.db.prepare("SELECT g.* FROM learning_groups g JOIN group_members m ON m.group_id=g.id WHERE g.scope=? AND m.user_id=? ORDER BY g.created_at,g.id").all(this.scope,user.id);
    return rows.map((row: any) => ({ id: row.id, name: row.name, ...(user.role === "instructor" ? { inviteCode: row.invite } : {}), members: user.role === "instructor" ? this.members(row.id) : [], assignments: this.assignments(row.id) }));
  }
  members(groupId: string): {id:string;name:string;email:string}[] {
    return this.db.prepare("SELECT user_id AS id,name,email FROM group_members WHERE group_id=? ORDER BY name,user_id").all(groupId);
  }
  owned(groupId: string, ownerId: string) {
    const row = this.db.prepare("SELECT id FROM learning_groups WHERE id=? AND scope=? AND owner_id=?").get(groupId,this.scope,ownerId);
    if (!row) throw new ContentError(404,"Classroom not found.");
  }
  create(user: User, name: unknown) {
    check(typeof name === "string" && name.trim().length > 0 && name.length <= 120,"Enter a group name of up to 120 characters.");
    check(this.groups(user).length < 50,"You can manage up to 50 groups.");
    const id=randomUUID(); this.db.prepare("INSERT INTO learning_groups VALUES (?,?,?,?,?,?)").run(id,this.scope,user.id,(name as string).trim(),randomBytes(18).toString("hex"),Date.now()); return id;
  }
  join(user: User, code: unknown) {
    check(typeof code === "string" && /^[a-f0-9]{36}$/.test(code),"Enter a valid group invitation code.");
    const group=this.db.prepare("SELECT * FROM learning_groups WHERE scope=? AND invite=?").get(this.scope,code);
    if (!group) throw new ContentError(404,"Invitation not found. Ask your instructor for the current code.");
    check(this.members(group.id).length < 500 || this.members(group.id).some(member=>member.id===user.id),"This group is full.");
    this.db.prepare("INSERT INTO group_members VALUES (?,?,?,?) ON CONFLICT(group_id,user_id) DO UPDATE SET name=excluded.name,email=excluded.email").run(group.id,user.id,user.name,user.email);
  }
  remove(groupId: string, ownerId: string, memberId: string) {
    this.owned(groupId,ownerId);
    this.db.prepare("DELETE FROM group_members WHERE group_id=? AND user_id=?").run(groupId,memberId);
    this.db.prepare("DELETE FROM assignment_starts WHERE user_id=? AND assignment_id IN (SELECT id FROM group_assignments WHERE group_id=?)").run(memberId,groupId);
  }
  deleteGroup(groupId: string, ownerId: string) {
    this.owned(groupId, ownerId); this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM assignment_starts WHERE assignment_id IN (SELECT id FROM group_assignments WHERE group_id=?)").run(groupId);
      this.db.prepare("DELETE FROM group_assignments WHERE group_id=?").run(groupId);
      this.db.prepare("DELETE FROM group_members WHERE group_id=?").run(groupId);
      this.db.prepare("DELETE FROM learning_groups WHERE id=?").run(groupId);
      this.db.exec("COMMIT");
    } catch(error) { this.db.exec("ROLLBACK"); throw error; }
  }
  deleteAssignment(groupId: string, ownerId: string, assignmentId: string) {
    this.owned(groupId, ownerId);
    if (!this.assignments(groupId).some(assignment=>assignment.id===assignmentId)) throw new ContentError(404,"Assignment not found.");
    this.db.exec("BEGIN IMMEDIATE");
    try { this.db.prepare("DELETE FROM assignment_starts WHERE assignment_id=?").run(assignmentId); this.db.prepare("DELETE FROM group_assignments WHERE id=? AND group_id=?").run(assignmentId,groupId); this.db.exec("COMMIT"); }
    catch(error) { this.db.exec("ROLLBACK"); throw error; }
  }
  rotate(groupId: string, ownerId: string) { this.owned(groupId,ownerId); this.db.prepare("UPDATE learning_groups SET invite=? WHERE id=?").run(randomBytes(18).toString("hex"),groupId); }
  assign(groupId: string, user: User, data: any, module: {id:string;vendor:string;title:string;lessons:{id:string}[]}) {
    this.owned(groupId,user.id);
    check(this.assignments(groupId).length < 100,"A group supports up to 100 assignments.");
    const due=Date.parse(data?.dueAt); const ids=module.lessons.map(lesson=>lesson.id);
    check(Number.isFinite(due) && due> Date.now() && due<Date.now()+5*366*86400000,"Choose a future due date within five years.");
    check(ids.length>0 && Number.isInteger(data.requiredCount) && data.requiredCount>=1 && data.requiredCount<=ids.length,"Choose a valid number of required lessons.");
    const id=randomUUID(); this.db.prepare("INSERT INTO group_assignments VALUES (?,?,?,?,?,?,?,?,?)").run(id,groupId,module.title,module.vendor,module.id,JSON.stringify(ids),data.requiredCount,due,Date.now());
    return id;
  }
  assignments(groupId: string): Assignment[] {
    return this.db.prepare("SELECT * FROM group_assignments WHERE group_id=? ORDER BY due_at,id").all(groupId).map((row:any)=>({id:row.id,title:row.title,vendor:row.vendor,moduleId:row.module_id,lessonIds:JSON.parse(row.lesson_ids) as string[],requiredCount:row.required_count,dueAt:row.due_at}));
  }
  start(assignmentId: string, userId: string) {
    const row=this.db.prepare("SELECT a.id FROM group_assignments a JOIN learning_groups g ON a.group_id=g.id JOIN group_members m ON m.group_id=g.id WHERE a.id=? AND g.scope=? AND m.user_id=?").get(assignmentId,this.scope,userId);
    if(!row) throw new ContentError(404,"Assignment not found.");
    this.db.prepare("INSERT OR IGNORE INTO assignment_starts VALUES (?,?,?)").run(assignmentId,userId,Date.now());
  }
  started(assignmentId:string,userId:string) { return !!this.db.prepare("SELECT started_at FROM assignment_starts WHERE assignment_id=? AND user_id=?").get(assignmentId,userId); }
}
export function assignmentStatus(assignment: {lessonIds:string[];requiredCount:number;dueAt:number}, completed: string[], started: boolean, now=Date.now()) {
  const done=assignment.lessonIds.filter(id=>completed.includes(id)).length;
  return { completed: done, required: assignment.requiredCount, status: done>=assignment.requiredCount ? "completed" : now>assignment.dueAt ? "overdue" : started || done>0 ? "started" : "assigned", started: started || done>0 };
}
