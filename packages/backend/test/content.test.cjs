const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createApp } = require('../dist/app');
const { PlatformStore } = require('../dist/platform/store');
const { ContentStore } = require('../dist/content/store');
const savedEnv = { ...process.env };
let server, base, accounts, content, draft, lessonId, taskId, answerTaskId;
const adminCookie = 'fortisim_session=content-admin-token';
const studentCookie = 'fortisim_session=content-student-token';
async function call(path, method = 'GET', body, cookie) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
}
function lesson(title = 'Custom lesson') {
  return { id: `custom-${randomUUID()}`, title, summary: 'Learn safely', minutes: 10, level: 'Foundation', body: 'Understand the default route.\n\nThen answer the tasks.', tasks: [
    { id: `task-${randomUUID()}`, type: 'choice', prompt: 'Which address is the default route?', choices: ['0.0.0.0/0', '127.0.0.1/32'], correctIndex: 0, acceptedAnswers: [] },
    { id: `task-${randomUUID()}`, type: 'answer', prompt: 'Name the gateway protocol.', choices: [], correctIndex: -1, acceptedAnswers: ['Private-answer-key', 'internet protocol'] },
  ] };
}
before(async () => {
  process.env.PLATFORM_MODE = 'standalone'; process.env.AUTH_REQUIRED = 'false'; process.env.ALLOW_REGISTRATION = 'true';
  accounts = new PlatformStore(':memory:'); content = new ContentStore(':memory:');
  const admin = accounts.createUser('author@example.org', 'Author', 'unused', 'instructor');
  const student = accounts.createUser('reader@example.org', 'Reader', 'unused');
  accounts.createSession(admin.id, 'content-admin-token', Date.now() + 600000); accounts.createSession(student.id, 'content-student-token', Date.now() + 600000);
  server = createApp(accounts, content).listen(0, '127.0.0.1'); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); accounts?.close(); content?.close(); process.env = savedEnv; });
test('authoring endpoints require an administrator, including writes', async () => {
  assert.equal((await call('/api/admin/modules')).status, 401);
  assert.equal((await call('/api/admin/modules', 'GET', undefined, studentCookie)).status, 403);
  assert.equal((await call('/api/admin/modules', 'POST', { vendor: 'fortigate', title: 'Forbidden' }, studentCookie)).status, 403);
  assert.equal((await call('/api/admin/modules', 'GET', undefined, adminCookie)).status, 200);
});
test('drafts remain private and published lessons omit all answer keys', async () => {
  const created = await call('/api/admin/modules', 'POST', { vendor: 'fortigate', title: 'Branch fundamentals' }, adminCookie);
  assert.equal(created.status, 201); draft = created.body;
  const item = lesson(); lessonId = item.id; taskId = item.tasks[0].id; answerTaskId = item.tasks[1].id;
  draft.module.lessons = [item];
  draft = (await call(`/api/admin/modules/${draft.module.id}`, 'PUT', { module: draft.module, revision: draft.revision }, adminCookie)).body;
  assert.deepEqual((await call('/api/content/catalog')).body.modules, []);
  assert.equal((await call(`/api/content/lessons/${lessonId}`)).status, 404);
  const published = await call(`/api/admin/modules/${draft.module.id}/publish`, 'POST', { revision: draft.revision }, adminCookie);
  assert.equal(published.status, 200); draft = published.body;
  const publicLesson = await call(`/api/content/lessons/${lessonId}`);
  const payload = JSON.stringify(publicLesson.body) + JSON.stringify((await call('/api/content/catalog')).body);
  assert.equal(payload.includes('Private-answer-key'), false);
  assert.equal(payload.includes('correctIndex'), false); assert.equal(payload.includes('acceptedAnswers'), false);
  assert.equal(publicLesson.body.tasks.length, 2);
});
test('custom tasks grade on the server, normalize answers, and support progress', async () => {
  const wrong = await call(`/api/content/lessons/${lessonId}/grade`, 'POST', { answers: [{ taskId, value: 1 }] });
  assert.equal(wrong.body.overallPassed, false);
  const valid = await call(`/api/content/lessons/${lessonId}/grade`, 'POST', { answers: [{ taskId, value: 0 }, { taskId: answerTaskId, value: '  INTERNET   PROTOCOL  ' }] });
  assert.equal(valid.body.overallPassed, true);
  assert.equal((await call(`/api/content/lessons/${lessonId}/grade`, 'POST', { answers: [{ taskId, value: 0 }, { taskId, value: 1 }] })).status, 400);
  const saved = await call('/api/account/progress/fortigate', 'POST', { completed: [lessonId] }, studentCookie);
  assert.deepEqual(saved.body.completed, [lessonId]);
  assert.equal((await call('/api/account/progress/paloalto', 'POST', { completed: [lessonId] }, studentCookie)).status, 400);
});
test('draft changes do not change published lessons until republished and stale writes fail', async () => {
  const oldRevision = draft.revision;
  draft.module.lessons[0].title = 'Updated title';
  const saved = await call(`/api/admin/modules/${draft.module.id}`, 'PUT', { module: draft.module, revision: draft.revision }, adminCookie);
  assert.equal(saved.status, 200); draft = saved.body;
  assert.equal((await call(`/api/content/lessons/${lessonId}`)).body.title, 'Custom lesson');
  assert.equal((await call(`/api/admin/modules/${draft.module.id}`, 'PUT', { module: draft.module, revision: oldRevision }, adminCookie)).status, 409);
  draft = (await call(`/api/admin/modules/${draft.module.id}/publish`, 'POST', { revision: draft.revision }, adminCookie)).body;
  assert.equal((await call(`/api/content/lessons/${lessonId}`)).body.title, 'Updated title');
});
test('unpublishing hides lessons and progress without deleting completion; republishing restores it', async () => {
  assert.equal((await call(`/api/admin/modules/${draft.module.id}`, 'DELETE', { revision: draft.revision }, adminCookie)).status, 409);
  draft = (await call(`/api/admin/modules/${draft.module.id}/unpublish`, 'POST', { revision: draft.revision }, adminCookie)).body;
  assert.equal((await call(`/api/content/lessons/${lessonId}`)).status, 404);
  assert.deepEqual((await call('/api/account/progress/fortigate', 'GET', undefined, studentCookie)).body.completed, []);
  draft = (await call(`/api/admin/modules/${draft.module.id}/publish`, 'POST', { revision: draft.revision }, adminCookie)).body;
  assert.deepEqual((await call('/api/account/progress/fortigate', 'GET', undefined, studentCookie)).body.completed, [lessonId]);
});
test('publishing incomplete tasks fails, reading-only lessons work, and metadata cannot be reassigned', () => {
  const store = new ContentStore(':memory:');
  try {
    let d = store.create('paloalto', 'Draft');
    assert.throws(() => store.publish(d.module.id, d.revision), /at least one lesson/);
    const item = lesson(); item.tasks[0].correctIndex = -1;
    d.module.lessons = [item]; d = store.save(d.module.id, d.module, d.revision);
    assert.throws(() => store.publish(d.module.id, d.revision), /correct choice/);
    d.module.lessons[0].tasks = []; d = store.save(d.module.id, d.module, d.revision); d = store.publish(d.module.id, d.revision);
    assert.equal(store.grade(item.id, []).overallPassed, true);
    assert.throws(() => store.save(d.module.id, { ...d.module, vendor: 'fortigate' }, d.revision), /cannot change/);
    d = store.unpublish(d.module.id, d.revision); store.delete(d.module.id, d.revision);
    assert.throws(() => store.get(d.module.id), /not found/);
  } finally { store.close(); }
});
test('published content survives reopening its SQLite database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'flames-content-')); let store;
  try {
    const filename = join(directory, 'content.sqlite'); store = new ContentStore(filename);
    let d = store.create('fortigate', 'Persistent'); const item = lesson(); d.module.lessons = [item]; d = store.save(d.module.id, d.module, d.revision); store.publish(d.module.id, d.revision);
    store.close(); store = new ContentStore(filename); assert.equal(store.publicLesson(item.id).title, item.title);
  } finally { store?.close(); rmSync(directory, { recursive: true, force: true }); }
});
