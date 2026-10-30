"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const dir = path.join(__dirname, "../plugin"), manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
test("full original Agent Network screens and assets are installed as a sandboxed package", () => {
  assert.equal(manifest.id, "kai.agent-network"); assert.equal(manifest.version, require("../package.json").version);
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  assert.doesNotMatch(html, /\bon\w+\s*=|<script(?! src=)|style=/i);
  for (const [, asset] of html.matchAll(/(?:src|href)="([^"]+)"/g)) { assert.ok(fs.existsSync(path.join(dir, asset)), asset); if (asset.endsWith(".js")) new vm.Script(fs.readFileSync(path.join(dir, asset), "utf8")); }
  const ui = fs.readFileSync(path.join(dir, "agent-network.js"), "utf8");
  for (const label of ["Discover", "My agents", "Jobs", "Earnings", "Activity", "Network settings", "Save result", "Export invitation", "Open workflow builder"]) assert.ok(ui.includes(label), label);
  assert.doesNotMatch(ui, /\bfetch\s*\(|XMLHttpRequest|WebSocket|\brequire\s*\(|\beval\s*\(/);
  assert.match(ui, /agentNetwork.saveFile/);
});
test("legacy renderer adapter preserves full original response shapes and rejects unknown actions", async () => {
  const calls = [], window = { kai: { async call(method, input) { calls.push({ method, input }); return method.endsWith("quote") ? { id: "quote-id" } : method.endsWith("legacyWorkflowChoices") ? [{ id: "workflow", name: "Full workflow" }] : { enabled: true, agents: [{ definition: { graph: {} } }], jobs: [{ output: "result" }], activity: [] }; } } };
  vm.runInNewContext(fs.readFileSync(path.join(dir, "bridge.js"), "utf8"), { window, document: { querySelector: () => null } });
  const status = await window.KaiCompanionClient.checked(window.kaiCompanionBridge.manage("agentNetworkStatus")); assert.equal(status.jobs[0].output, "result"); assert.ok(status.agents[0].definition.graph);
  assert.equal(await window.KaiCompanionClient.checked(window.kaiCompanionBridge.manage("agentNetworkQuote", { id: "service", input: { typed: true } })), "quote-id");
  assert.deepEqual(calls.at(-1).input, { id: "service", input: { typed: true } });
  const choices = await window.KaiCompanionClient.checked(window.kaiCompanionBridge.manage("status")); assert.equal(choices.workflows[0].id, "workflow");
  assert.equal((await window.kaiCompanionBridge.manage("brainSearch", {})).ok, false);
});
