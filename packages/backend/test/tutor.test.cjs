const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { createApp } = require("../dist/app");
const { PlatformStore } = require("../dist/platform/store");
const { cleanTutorText, guidedHint, panTopic } = require("../dist/services/tutor");
const { shuffleChoices } = require("../dist/services/questionStore");
const { TASK_CONCEPTS } = require("../dist/controllers/knowledgeCheckController");
const { generateKnowledgeCheck } = require("../dist/services/nimKnowledgeCheck");
const { TASK_CONCEPTS: PAN_TASK_CONCEPTS, generatePanKnowledgeCheck } = require("../dist/services/nimPanKnowledgeCheck");

let server, store, base;
const originalEnv = { ...process.env };
async function post(path, data) {
  const response = await fetch(base + path, { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } });
  return { status: response.status, body: await response.json() };
}
before(async () => {
  // No AI provider: every tutor path must fall back to built-in content.
  for (const key of ["NVIDIA_NIM_API_KEY", "OPENAI_API_KEY", "LLM_API_KEY"]) delete process.env[key];
  process.env.AUTH_REQUIRED = "false";
  store = new PlatformStore(":memory:");
  server = createApp(store).listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  store.close();
  process.env = originalEnv;
});

test("tutor output drops reasoning blocks and markdown and caps sentences", () => {
  const raw = "<think>The answer is LAN, but I must not say it.</think>\n**Check** the `zone` direction.\n- One. Two! Three? Four. Five.";
  const text = cleanTutorText(raw, 4);
  assert.doesNotMatch(text, /think|LAN|\*\*|`|^-/);
  assert.equal(text.split(/(?<=[.!?])\s+/).length, 4);
});

test("guided hints are topic-specific", () => {
  assert.equal(panTopic("pan-nat-02"), "pan-nat");
  assert.equal(panTopic("pan-zone-final"), "pan-zone");
  assert.equal(panTopic("pan-iface-01"), "pan-interface");
  assert.equal(panTopic(undefined), "pan-security");
  assert.match(guidedHint("pan-nat", ["Translation type"]), /NAT/);
  assert.match(guidedHint("fortigate-port", []), /physically connected/);
});

test("every knowledge-check task has an offline question", async () => {
  for (const [taskId, meta] of Object.entries(TASK_CONCEPTS)) {
    const question = await generateKnowledgeCheck(taskId, meta.title, meta.concept);
    assert.equal(question.source, "bank", taskId);
  }
  for (const taskId of Object.keys(PAN_TASK_CONCEPTS)) {
    assert.equal((await generatePanKnowledgeCheck(taskId)).source, "bank", taskId);
  }
});

test("shuffling keeps the correct answer and spreads its position", () => {
  const question = { question: "Q?", choices: ["right", "b", "c", "d"], correctIndex: 0 };
  const positions = new Set();
  for (let i = 0; i < 200; i++) {
    const shuffled = shuffleChoices(question);
    assert.equal(shuffled.choices[shuffled.correctIndex], "right");
    assert.deepEqual([...shuffled.choices].sort(), ["b", "c", "d", "right"]);
    positions.add(shuffled.correctIndex);
  }
  assert.equal(positions.size, 4);
});

test("feedback endpoints return labelled guided hints without an AI provider", async () => {
  const nat = await post("/api/pan/feedback", { taskId: "pan-nat-01", exerciseTitle: "Outbound SNAT", failingChecks: ["Translation type"] });
  assert.equal(nat.status, 200);
  assert.equal(nat.body.source, "guide");
  assert.match(nat.body.feedback, /NAT/);

  const iface = await post("/api/interface-submissions/interface-ip-01/feedback", { scenarioId: "interface-ip-01", interfaces: [] });
  assert.equal(iface.body.remarkSource, "guide");
  assert.ok(iface.body.aiRemark.length > 20);

  const port = await post("/api/port-submissions/port-assignment-01/feedback", { scenarioId: "port-assignment-01", assignments: [] });
  assert.equal(port.body.remarkSource, "guide");
  // Grade reports and hints must not reveal the expected zone.
  for (const result of port.body.report.results) assert.doesNotMatch(result.description, /→\s*(WAN|LAN|DMZ|Unassigned)/i);
  assert.doesNotMatch(port.body.aiRemark, /→\s*(WAN|LAN|DMZ)/);
});

test("knowledge-check responses say where the question came from", async () => {
  const response = await fetch(`${base}/api/pan/knowledge-check/pan-nat-final`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.source, "bank");
  assert.equal("correctIndex" in body, false);
});

test("unknown and prototype-named knowledge tasks return 404 without generation", async () => {
 for(const id of ['constructor','__proto__','toString','unknown-task'])for(const prefix of ['/api/knowledge-check/','/api/pan/knowledge-check/']){
  const response=await fetch(base+prefix+id);assert.equal(response.status,404);
 }
 const {getStaticFallbackQuestion}=require('../dist/services/llmClient');assert.equal(getStaticFallbackQuestion('constructor'),null);
});
