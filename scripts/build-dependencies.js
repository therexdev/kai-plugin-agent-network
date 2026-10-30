"use strict";
// Publication-time only: use npm ci --ignore-scripts, then npm run build.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."), lock = require("../package-lock.json");
const source = path.resolve(process.env.KAI_BUILD_DEPENDENCIES || path.join(root, "node_modules"));
const target = path.join(root, "plugin/service/node_modules");
fs.rmSync(target, { recursive: true, force: true }); fs.mkdirSync(target, { recursive: true });
const receipt = { lockSha256: crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "package-lock.json"))).digest("hex"), packages: {}, files: {} };
for (const [relative, meta] of Object.entries(lock.packages)) {
  if (!relative) continue;
  if (!relative.startsWith("node_modules/") || relative.includes("..")) throw Error("Unsupported dependency location");
  const packageRelative = relative.slice("node_modules/".length), from = path.join(source, packageRelative), to = path.join(target, packageRelative);
  const actual = JSON.parse(fs.readFileSync(path.join(from, "package.json"), "utf8"));
  if (actual.version !== meta.version) throw Error(`Dependency version mismatch for ${packageRelative}`);
  receipt.packages[packageRelative] = { version: meta.version, integrity: meta.integrity };
  function walk(directory, prefix = "") {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw Error("Dependency symlinks are not bundled");
      if (packageRelative === "koilib" && !prefix && ["src", "dist"].includes(entry.name)) continue;
      if (entry.name === "node_modules" || entry.name.startsWith(".") || ["test", "tests", "__tests__", "examples", "coverage"].includes(entry.name)) continue;
      const rel = prefix + entry.name;
      if (entry.isDirectory()) { walk(path.join(directory, entry.name), rel + "/"); continue; }
      let outputName = rel;
      if (/^(?:LICENSE|COPYING|NOTICE)(?:[.-].*)?$/i.test(entry.name) && !/\.txt$/i.test(entry.name)) outputName += ".txt";
      else if (!/\.(?:js|cjs|mjs|json|wasm|txt)$/i.test(rel) || /\.test\.[cm]?js$/i.test(rel)) continue;
      const bytes = fs.readFileSync(path.join(directory, entry.name)), dest = path.join(to, outputName);
      fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, bytes);
      receipt.files[packageRelative + "/" + outputName] = crypto.createHash("sha256").update(bytes).digest("hex");
    }
  }
  walk(from);
}
fs.writeFileSync(path.join(root, "plugin/service/dependencies.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(`Bundled ${Object.keys(receipt.packages).length} locked dependencies (${Object.keys(receipt.files).length} files).`);
