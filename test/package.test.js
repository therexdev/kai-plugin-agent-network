"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), os = require("node:os"), { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, ".."), service = path.join(root, "plugin/service"), hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
test("every vendored dependency matches the locked publication receipt", () => {
  const receipt = JSON.parse(fs.readFileSync(path.join(service, "dependencies.json")));
  assert.equal(receipt.lockSha256, hash(fs.readFileSync(path.join(root, "package-lock.json"))));
  for (const [file, digest] of Object.entries(receipt.files)) assert.equal(hash(fs.readFileSync(path.join(service, "node_modules", file))), digest, file);
  assert.equal(receipt.packages["quickjs-emscripten"].version, "0.32.0"); assert.equal(receipt.packages.koilib.version, "9.4.0");
});
test("the signed-source service loads and evaluates code without a Core checkout or global modules", t => {
  const isolated = fs.mkdtempSync(path.join(os.tmpdir(), "kai-plugin-standalone-")); t.after(() => fs.rmSync(isolated, { recursive: true, force: true }));
  fs.cpSync(service, path.join(isolated, "service"), { recursive: true });
  const result = spawnSync(process.execPath, ["-e", 'require("./service/index"); require("./service/runtime/values").evaluate("input+1",{item:{},items:[],input:41,nodes:{},iteration:0}).then(x=>{if(x!==42)process.exit(1);console.log("isolated-runtime-ok")})'], { cwd: isolated, encoding: "utf8", env: { PATH: process.env.PATH }, timeout: 15000 });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /isolated-runtime-ok/);
});
test("the manifest and runtime use public Foundation dependencies only", () => {
  const manifest = require("../plugin/manifest.json"); assert.equal(manifest.apiVersion, 3); assert.equal(manifest.runtime, "native"); assert.ok(manifest.permissions.includes("native.execute")); assert.deepEqual(manifest.consumes, ["kai.workflows"]);
  for (const file of ["index.js", "runtime.js", "network.js", "transport.js", "store.js", "runtime/base.js", "runtime/engine.js"]) {
    const source = fs.readFileSync(path.join(service, file), "utf8"); assert.doesNotMatch(source, /require\(["'][^"']*(?:core\/|electron\/|\.\.\/\.\.\/)/, file);
  }
  const jobEngine = fs.readFileSync(path.join(service, "runtime/engine.js"), "utf8"); assert.doesNotMatch(jobEngine, /this\.connections|this\.chats|this\.fetch|this\.store\.(search|note|remove)/);
});
