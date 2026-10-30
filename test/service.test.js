"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const { create, safeDefinition } = require("../plugin/service/index"), { template } = require("../plugin/service/runtime"), M = require("../plugin/service/runtime/model"), V = require("../plugin/service/runtime/values"), P = require("../plugin/service/protocol");
const { Transport } = require("../plugin/service/transport");
function fixture(t, options = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "kai-agent-owned-")), controller = new AbortController(), calls = [], confirms = [];
  const api = { version: 1, plugin: { dataDir }, signal: controller.signal,
    secrets: { isEncryptionAvailable: () => true, getSelectedStorageBackend: () => "fixture-only", encryptString: text => Buffer.from(text), decryptString: bytes => bytes.toString() },
    models: { list: () => [{ alias: "local", status: "ready" }], chat: async (input, signal) => { signal.throwIfAborted(); calls.push(input); return { choices: [{ message: { content: "Selected local answer" } }] }; } },
    network: { status: () => ({ privacyMode: "local-only" }), fetch: async () => { throw Error("Unexpected network access"); } },
    desktop: { confirm: async (title, detail) => { confirms.push({ title, detail }); return true; }, openPlugin: async id => { calls.push({ plugin: id }); } },
    services: { call: async (_name, method, input) => { const workflows = options.workflows || []; if (method === "listServices") return workflows.map(({ id, name, draft }) => ({ id, name, draft })); if (method === "exportService") { const item = workflows.find(w => w.id === input.id && !w.draft); if (!item) throw Error("Choose a saved workflow"); return structuredClone(item); } throw Error("Unknown service"); } }, ...options.api };
  let service = create(api); t.after(async () => { service.dispose(); await new Promise(resolve => setTimeout(resolve, 5)); fs.rmSync(dataDir, { recursive: true, force: true }); });
  return { api, dataDir, calls, confirms, controller, get service() { return service; }, reopen() { service.dispose(); service = create(api); }, call: (method, input = {}, signal) => service.call("agentNetwork." + method, input, signal) };
}
async function until(f, predicate) {
  for (let i = 0; i < 80; i++) { const state = await f.call("workspaceRefresh"); if (predicate(state)) return state; await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.fail("Service job did not reach the expected state: " + JSON.stringify((await f.call("workspaceStatus")).jobs));
}
async function run(f, input, definition) {
  await f.call("settings", { enabled: true, endpoints: [] });
  const card = await f.call("workspaceSave", { name: "Owned service", template: "echo", ...(definition ? { definition } : {}) });
  const quote = await f.call("quote", { id: card.payload.agent_id, input });
  await until(f, state => state.jobs.some(job => job.id === quote.id && job.role === "buyer" && job.status === "quoted"));
  await f.call("submit", { id: quote.id });
  return { quote, card };
}
test("real standalone plugin completes quote, isolated execution, delivery and acceptance", async t => {
  const f = fixture(t), { quote } = await run(f, "Chosen input only");
  const state = await until(f, state => state.jobs.some(job => job.role === "buyer" && job.status === "delivered"));
  assert.equal(state.jobs.find(job => job.role === "buyer").output, "Chosen input only");
  assert.doesNotMatch(JSON.stringify(state), /encryption_private|"wif"/);
  await f.call("job", { id: quote.id, role: "buyer", action: "accept" });
  await until(f, state => state.jobs.every(job => job.status === "accepted"));
  assert.equal(f.calls.length, 0); assert.equal(state.paid, false);
});
test("reasoning invokes only an explicit ready local model with bounded output budget", async t => {
  const f = fixture(t); await run(f, "The chosen text", template("summary", "local"));
  const state = await until(f, state => state.jobs.some(job => job.role === "buyer" && job.status === "delivered"));
  assert.equal(state.jobs.find(job => job.role === "buyer").output, "Selected local answer");
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].model, "local"); assert.equal(f.calls[0].max_tokens, 2048);
  assert.match(f.calls[0].messages[0].content, /The chosen text/);
});
test("workflow definitions copy through the public bus; private capabilities are rejected", async t => {
  const good = { ...template("echo"), id: "safe", name: "Safe" }, bad = { ...template("echo"), id: "unsafe", name: "Private" }; bad.graph.nodes[1].type = "memory";
  const f = fixture(t, { workflows: [good, bad] }); await f.call("settings", { enabled: true, endpoints: [] });
  assert.deepEqual(await f.call("workflowChoices"), [{ id: "safe", name: "Safe" }]);
  await assert.rejects(f.call("fromWorkflow", { workflowId: "unsafe" }));
  assert.ok((await f.call("fromWorkflow", { workflowId: "safe" })).id);
  for (const type of ["memory", "tool_call", "http_request", "sub_workflow"]) { const spec = template("echo"); spec.graph.nodes[1].type = type; assert.throws(() => safeDefinition(spec)); }
  for (const [key, value] of [["connectionId", "private"], ["sourceId", "brain"], ["saveChat", true], ["tools", [{ connectionId: "private" }]]]) { const spec = template("echo"); spec.graph.nodes[1].config[key] = value; assert.throws(() => safeDefinition(spec), /public services/); }
  await assert.rejects(f.call("save", { amount_atoms: "1" }), /Paid rentals/);
});
test("QuickJS has no host objects and interrupts runaway code and oversized outputs", async () => {
  const scope = { item: {}, items: [], input: "data", nodes: {}, iteration: 0 };
  assert.deepEqual(await V.evaluate("return [typeof process,typeof require,typeof fetch,typeof global,typeof api]", scope, null, false), ["undefined", "undefined", "undefined", "undefined", "undefined"]);
  await assert.rejects(V.evaluate("while(true){}", scope, null, false), /failed/);
  await assert.rejects(V.evaluate('return "x".repeat(300000)', scope, null, false), /200 KB/);
});
test("code service preserves typed results without service bus or native calls", async t => {
  const f = fixture(t), nodes = [M.node("trigger", "input"), M.node("code", "compute", {}, { source: "return {count: input.count + 1}" }), M.node("output", "result", {}, { text: "=({count:nodes.compute.count})" })];
  const definition = { name: "Count", graph: { version: 1, nodes, edges: [M.edge("input", "compute"), M.edge("compute", "result")] } };
  await f.call("settings", { enabled: true, endpoints: [] });
  const schema = { type: "object", properties: { count: { type: "integer" } }, required: ["count"] };
  const card = await f.call("workspaceSave", { definition, input_schema: schema, output_schema: schema });
  const quote = await f.call("quote", { id: card.payload.agent_id, input: { count: 7 } });
  await until(f, state => state.jobs.some(job => job.role === "buyer" && job.status === "quoted")); await f.call("submit", { id: quote.id });
  const state = await until(f, state => state.jobs.some(job => job.role === "buyer" && job.status === "delivered"));
  assert.equal(state.jobs.find(job => job.role === "buyer").output.count, 8);
});
test("signature domains, payload integrity, encryption recipients and replay encodings are checked", async () => {
  const key = P.identity(), signed = await P.sign("quote", { amount: "0" }, key);
  assert.equal(P.verify(signed, "quote").amount, "0"); assert.throws(() => P.verify(signed, "manifest"), /domain/);
  signed.payload.amount = "1"; assert.throws(() => P.verify(signed, "quote"), /Signature/);
  assert.throws(() => P.parse('{"x":1,"x":2}'), /canonical/);
  const other = P.identity(), box = P.seal({ text: "private" }, key.encryption_public, { id: "one" });
  assert.equal(P.open(box, key.encryption_private).text, "private"); assert.throws(() => P.open(box, other.encryption_private));
});
test("enabled background sessions resume, disabled sessions stay stopped and state is plugin-local", async t => {
  const f = fixture(t); await f.call("settings", { enabled: true, endpoints: [] }); await f.call("save", { template: "echo" });
  f.reopen(); f.service.startBackground(); assert.equal((await f.call("status")).sessionActive, true);
  await f.call("settings", { enabled: false, endpoints: [] }); f.reopen(); f.service.startBackground(); assert.equal((await f.call("status")).sessionActive, false);
  assert.deepEqual(fs.readdirSync(f.dataDir), ["agent-network.json"]);
});
test("cancelled or revoked operations and corrupted state fail without overwriting", async t => {
  const f = fixture(t); f.api.desktop.confirm = async () => false;
  await assert.rejects(f.call("settings", { enabled: true }), /Cancelled/); assert.equal((await f.call("status")).enabled, false);
  const abort = new AbortController(); abort.abort(); await assert.rejects(f.call("settings", { enabled: true }, abort.signal));
  f.service.dispose(); const file = path.join(f.dataDir, "agent-network.json"); fs.writeFileSync(file, "unreadable"); f.reopen();
  await assert.rejects(f.call("status"), /keychain/); assert.equal(fs.readFileSync(file, "utf8"), "unreadable");
});
test("late inference after disposal cannot mutate saved job state", async t => {
  let release, started; const ready = new Promise(resolve => { started = resolve; });
  const f = fixture(t); f.api.models.chat = async () => { started(); return new Promise(resolve => { release = resolve; }); };
  await run(f, "Chosen text", template("summary", "local")); await ready; f.service.dispose();
  const file = path.join(f.dataDir, "agent-network.json"), before = fs.readFileSync(file);
  release({ choices: [{ message: { content: "late" } }] }); await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual(fs.readFileSync(file), before);
});
test("transport uses only Foundation broker, forbids insecure endpoints, limits responses and stops on Local-Only", async () => {
  let privacy = "local-first", calls = 0;
  const transport = new Transport({ privacyMode: () => privacy, fetchImpl: async (_url, options) => { calls++; assert.equal(Object.hasOwn(options, "redirect"), false); return new Response(P.canonical({ ok: true })); } });
  assert.deepEqual(await transport.request("https://example.org", "/agent-network/v1/config"), { ok: true });
  for (const origin of ["http://127.0.0.1", "https://user:password@example.org", "https://example.org/path"]) await assert.rejects(transport.request(origin, "/agent-network/v1/config"));
  privacy = "local-only"; await assert.rejects(transport.request("https://example.org", "/agent-network/v1/config"), /Local-Only/); assert.equal(calls, 1);
});
test("host step budget and saved package validation stay enforced", async t => {
  const f = fixture(t); await f.call("settings", { enabled: true, endpoints: [] });
  const card = await f.call("workspaceSave", { template: "echo", limits: { input_bytes: 100, output_bytes: 100, steps: 1, model_calls: 1, seconds: 10 } });
  const quote = await f.call("quote", { id: card.payload.agent_id, input: "chosen" });
  await until(f, state => state.jobs.some(job => job.role === "buyer" && job.status === "quoted")); await f.call("submit", { id: quote.id });
  const state = await until(f, state => state.jobs.some(job => job.role === "buyer" && job.status === "failed"));
  assert.match(state.jobs.find(job => job.role === "buyer").error, /step limit/);
  f.controller.abort(); await assert.rejects(f.call("status"), /abort/i);
});
