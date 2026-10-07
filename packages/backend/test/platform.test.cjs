const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { once } = require("node:events");
const { createApp } = require("../dist/app");
const { PlatformStore } = require("../dist/platform/store");
const { hashPassword, verifyPassword } = require("../dist/platform/auth");
const { hideAnswer, checkAnswer } = require("../dist/services/questionStore");

let server, store, base, aliceCookie, bobCookie, aliceId, instructorCookie;
const password = "Long-test-password-2026!";
const originalEnv = { ...process.env };
async function request(path, data, cookie, headers = {}) {
  const response = await fetch(base + path, {
    ...(data === undefined ? {} : { method: "POST", body: JSON.stringify(data) }),
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...headers },
  });
  return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0], headers: response.headers };
}
before(async () => {
  process.env.NODE_ENV = "test";
  process.env.AUTH_REQUIRED = "false";
  process.env.ALLOW_REGISTRATION = "true";
  process.env.FRONTEND_ORIGIN = "http://localhost:5173";
  delete process.env.NVIDIA_NIM_API_KEY;
  store = new PlatformStore(":memory:");
  const instructor = store.createUser("teacher@example.org", "Instructor", await hashPassword(password), "instructor");
  store.createSession(instructor.id, "instructor-test", Date.now() + 60_000);
  instructorCookie = "fortisim_session=instructor-test";
  server = createApp(store).listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (store) store.close();
  process.env = originalEnv;
});

test("password hashes use unique salts and reject wrong passwords", async () => {
  const a = await hashPassword(password), b = await hashPassword(password);
  assert.notEqual(a, b);
  assert.equal(await verifyPassword(password, a), true);
  assert.equal(await verifyPassword("wrong-password", a), false);
  assert.equal(a.includes(password), false);
});
test("health and guest session are public, with JSON route recovery", async () => {
  assert.equal((await request("/api/health")).body.status, "ok");
  assert.equal((await request("/api/account/session")).body.user, null);
  assert.equal((await request("/api/missing")).status, 404);
});
test("registers students only and sets an HTTP-only session cookie", async () => {
  const result = await request("/api/account/register", { name: "Alice", email: "ALICE@example.org", password, role: "instructor" });
  assert.equal(result.status, 201);
  assert.equal(result.body.user.role, "student");
  assert.equal(result.body.user.email, "alice@example.org");
  assert.equal("password" in result.body.user, false);
  assert.match(result.headers.get("set-cookie"), /HttpOnly/);
  assert.match(result.headers.get("set-cookie"), /SameSite=Lax/);
  aliceCookie = result.cookie; aliceId = result.body.user.id;
  const bob = await request("/api/account/register", { name: "Bob", email: "bob@example.org", password });
  assert.equal(bob.status, 201); bobCookie = bob.cookie;
});
test("rejects duplicate accounts and invalid credentials", async () => {
  assert.equal((await request("/api/account/register", { name: "Duplicate", email: "alice@example.org", password })).status, 409);
  assert.equal((await request("/api/account/register", { name: "Bad", email: "invalid", password })).status, 400);
  assert.equal((await request("/api/account/login", { email: "alice@example.org", password: "Wrong-password-2026!" })).status, 401);
  assert.equal((await request("/api/account/login", { email: "absent@example.org", password })).status, 401);
});
test("progress is authenticated, account-scoped, vendor-scoped, and merged monotonically", async () => {
  assert.equal((await request("/api/account/progress/fortigate", { completed: ["task-1"] })).status, 401);
  assert.equal((await request("/api/account/progress/unknown", undefined, aliceCookie)).status, 400);
  assert.equal((await request("/api/account/progress/fortigate", { completed: ["invalid task"] }, aliceCookie)).status, 400);
  assert.deepEqual((await request("/api/account/progress/fortigate", { completed: ["task-1", "task-1"] }, aliceCookie)).body.completed, ["task-1"]);
  assert.deepEqual((await request("/api/account/progress/fortigate", { completed: ["task-2"] }, aliceCookie)).body.completed, ["task-1", "task-2"]);
  assert.deepEqual((await request("/api/account/progress/fortigate", undefined, bobCookie)).body.completed, []);
  assert.deepEqual((await request("/api/account/progress/paloalto", undefined, aliceCookie)).body.completed, []);
});
test("classroom access is instructor-only and never returns credentials", async () => {
  assert.equal((await request("/api/account/classroom")).status, 401);
  assert.equal((await request("/api/account/classroom", undefined, aliceCookie)).status, 403);
  const result = await request("/api/account/classroom", undefined, instructorCookie);
  assert.equal(result.status, 200);
  assert.equal(result.body.students.length, 2);
  assert.match(result.body.provenance, /Student-reported/);
  assert.equal(JSON.stringify(result.body).includes("password"), false);
});
test("mutating requests reject unapproved origins and malformed/oversized JSON", async () => {
  assert.equal((await request("/api/account/logout", {}, aliceCookie, { Origin: "https://untrusted.example" })).status, 403);
  const bad = await fetch(base + "/api/account/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error, /Malformed/);
  const huge = await request("/api/account/login", { payload: "x".repeat(270_000) });
  assert.equal(huge.status, 413);
});
test("deployment can require authentication and disable self-registration", async () => {
  process.env.AUTH_REQUIRED = "true"; process.env.ALLOW_REGISTRATION = "false";
  try {
    assert.equal((await request("/api/scenarios")).status, 401);
    assert.equal((await request("/api/scenarios", undefined, aliceCookie)).status, 200);
    assert.equal((await request("/api/account/session")).body.authRequired, true);
    assert.equal((await request("/api/account/register", { name: "New", email: "new@example.org", password })).status, 403);
  } finally { process.env.AUTH_REQUIRED = "false"; process.env.ALLOW_REGISTRATION = "true"; }
});
test("student-facing scenario endpoint omits expected outcomes", async () => {
  const result = await request("/api/scenarios/web-server-access-01");
  assert.equal(result.status, 200);
  assert.equal("expectedOutcomes" in result.body, false);
});
test("PAN submissions are graded on the server with configuration validation", async () => {
  const config = [{ id: 1, name: "SNAT", type: "source", srcZone: "Trust", dstZone: "Untrust", dstAddr: "any", translated: "interface" }];
  const result = await request("/api/pan/grade/pan-nat-01", { config });
  assert.equal(result.status, 200);
  assert.equal(result.body.overallPassed, true);
  assert.equal((await request("/api/pan/grade/pan-nat-01", { config: [{}] })).status, 400);
  assert.equal((await request("/api/pan/grade/pan-nat-01", { config: [{ ...config[0], translated: "interface-incorrect" }] })).body.overallPassed, false);
});
test("production sessions use Secure cookies", async () => {
  process.env.NODE_ENV = "production";
  try {
    const result = await request("/api/account/login", { email: "alice@example.org", password });
    assert.equal(result.status, 200);
    assert.match(result.headers.get("set-cookie"), /Secure/);
  } finally { process.env.NODE_ENV = "test"; }
});
test("AI outage is graceful and invalid feedback is rejected", async () => {
  assert.equal((await request("/api/pan/feedback", { exerciseTitle: "Test", failingChecks: ["Zone mismatch"] })).status, 503);
  assert.equal((await request("/api/pan/feedback", {})).status, 400);
  assert.equal((await request("/api/knowledge-check/web-server-access-01")).status, 503);
});
test("knowledge checks hide answers, validate shape, and allow only one answer", () => {
  const hidden = hideAnswer({ question: "Question?", choices: ["A", "B", "C", "D"], correctIndex: 2 });
  assert.equal("correctIndex" in hidden, false);
  assert.throws(() => checkAnswer(hidden.questionId, 7));
  assert.equal(checkAnswer(hidden.questionId, 2), true);
  assert.throws(() => checkAnswer(hidden.questionId, 2), /already answered/);
  assert.throws(() => hideAnswer({ question: "?", choices: ["A", "B", "C", "D"], correctIndex: 9 }), /invalid/);
});
test("logout revokes sessions and expired sessions are rejected", async () => {
  assert.equal((await request("/api/account/session", undefined, aliceCookie)).body.user.id, aliceId);
  assert.equal((await request("/api/account/logout", {}, aliceCookie)).status, 200);
  assert.equal((await request("/api/account/session", undefined, aliceCookie)).body.user, null);
  store.createSession(aliceId, "expired-token", Date.now() - 1);
  assert.equal((await request("/api/account/session", undefined, "fortisim_session=expired-token")).body.user, null);
});
test("SQLite persists accounts and completion through a restart", async () => {
  const directory = mkdtempSync(join(tmpdir(), "fortisim-store-test-"));
  const filename = join(directory, "test.sqlite");
  let disk;
  try {
    disk = new PlatformStore(filename);
    const user = disk.createUser("persistent@example.org", "Persistent", await hashPassword(password));
    disk.mergeProgress(user.id, "fortigate", ["task-1"]); disk.close(); disk = undefined;
    disk = new PlatformStore(filename);
    assert.equal(disk.findEmail(user.email).user.id, user.id);
    assert.deepEqual(disk.progress(user.id, "fortigate"), ["task-1"]);
  } finally { disk?.close(); rmSync(directory, { recursive: true, force: true }); }
});
test("sign-in attempt limits bound password-derivation work", async () => {
  let limited = false;
  for (let index = 0; index < 25; index++) {
    const result = await request("/api/account/login", {});
    if (result.status === 429) { limited = true; break; }
  }
  assert.equal(limited, true);
});
