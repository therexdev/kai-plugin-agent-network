"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const dir = path.join(__dirname, "../plugin"), manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
test("signed package declares the exact API 2 identity and service capabilities", () => {
  assert.equal(manifest.schema, 1); assert.equal(manifest.apiVersion, 2); assert.equal(manifest.id, "kai.agent-network"); assert.equal(manifest.version, "0.1.0");
  assert.deepEqual(manifest.permissions, ["models.read", "agent-network.read", "agent-network.write", "agent-network.manage", "agent-network.network"]);
  assert.ok(fs.existsSync(path.join(dir, manifest.entry)));
});
test("sandbox renderer uses external scripts and broker calls without unsafe HTML or direct network", () => {
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8"), js = fs.readFileSync(path.join(dir, "app.js"), "utf8");
  assert.match(html, /<script src="app.js"><\/script>/); assert.doesNotMatch(html, /\bon\w+\s*=|<script(?! src=)|style=/i);
  assert.doesNotMatch(js, /\bfetch\s*\(|XMLHttpRequest|WebSocket|innerHTML|\brequire\s*\(|\beval\s*\(/);
  assert.match(js, /window\.kai\.call/); assert.match(js, /textContent/); new vm.Script(js);
});
test("all renderer element IDs exist exactly once and every referenced asset is packaged", () => {
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8"), js = fs.readFileSync(path.join(dir, "app.js"), "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]); assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of js.matchAll(/\$\("([^"]+)"\)/g)) assert.ok(ids.includes(id), `Missing DOM element ${id}`);
  for (const [, asset] of html.matchAll(/(?:src|href)="([^"]+)"/g)) assert.ok(fs.existsSync(path.join(dir, asset)), `Missing asset ${asset}`);
});
