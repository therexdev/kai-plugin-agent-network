# KAI Agent Network

Agent Network owns its service definitions, signed invitations, private service identity, encrypted records, relay protocol, job lifecycle and isolated execution engine. Core supplies documented Foundation services for local models, network policy, secure storage, approvals and lifecycle. No Agent Network engine or feature-specific handler is required in Core.

The installed workspace includes Discover, My agents, Jobs, Earnings, Activity and Network settings. It supports private free services, local testing, signed invitations, relay discovery/publication, reviewable quotes, job submission, delivery, approval, cancellation and result export. Paid rentals and on-chain settlement are not enabled; the UI and protocol do not claim they are.

## Trust and job isolation

The plugin itself is **native code with full computer/application access**. Its installation must be explicitly trusted. A native plugin is not sandboxed simply because it has its own folder. The UI remains a sandboxed renderer.

Remote service jobs do **not** inherit native plugin authority. They receive a copied, validated graph and JSON input. Their runtime permits bounded data transforms, local model reasoning, branches, loops, output and approval nodes. Code and expressions run in QuickJS with 16 MiB memory, a 256 KiB stack and execution deadlines; no host functions, Node modules, filesystem, network, environment, service SDK or process objects are provided. Per-job model-call, step, output and time limits remain enforced.

Private Brain records, accounts, files, HTTP actions, tool calls, schedules, chat saving and sub-workflows are rejected when packaging and again when starting persisted jobs. Those private-operation implementations are absent from the plugin's job engine. The plugin's local service-management UI may copy a saved workflow through the declared `kai.workflows` service; hosted jobs cannot call that service.

## Data and lifecycle

State belongs to `api.plugin.dataDir/agent-network.json`, encrypted through Foundation's OS-storage service. A separate service identity signs invitations and messages; the KAI payment wallet is not used. Foundation starts a new profile, and this release does not read, migrate or delete older app records.

An explicitly enabled session resumes while KAI is open or in the tray. Disable/remove/quit revokes work and stops networking. Local-Only prevents relay traffic. Corrupt or externally changed records are preserved and rejected rather than overwritten. Interrupted work with uncertain effects is not automatically replayed.

## Build and test

The native entry point is `plugin/service/index.js`. Feature code and runtime dependencies are included in the signed package. Dependencies are pinned in `package-lock.json` and copied into the package at publication time:

```sh
npm ci --ignore-scripts
npm run build
npm test
```

`plugin/service/dependencies.json` records the lockfile hash, package versions and hashes of every bundled dependency file. The build script performs no downloads and runs no dependency installation hooks. The client never runs npm or installation scripts. Publisher signatures cover the dependency bundle, including QuickJS WASM.

After packing a new immutable release, `node scripts/verify-package.js` checks the signature and exact source/package match. Tests execute real local quote-to-delivery flows, typed graph/code results, local inference, workflow capability rejection, QuickJS resource limits, signature/encryption checks, shutdown, storage protection and the original UI transport.

The public integration uses Foundation API v1 and package schema 2/API 3. Required services are `models`, `network`, `secrets`, `desktop` and declared local `services.call`. There are no Core source imports, shared companion store, publisher-only feature APIs or wallet-key requests.

## Foundation package publication

Requires KAI Core **0.7.0 or later**, manifest schema 2/API 3 and native API v1. Source lives in `plugin/`, including its service and all runtime dependencies. Runtime installation never runs npm or dependency hooks.

Before signing, install any author dependencies with `npm ci --ignore-scripts` when this repository has a lockfile, run `npm run build --if-present`, then `node scripts/verify-package.js --source` and `npm test`. The source-only check uses a temporary in-memory test signature; it does not claim a publisher release was signed.

Pack the complete plugin using Core's `scripts/core/pack-plugin.js`, keeping the publisher private key outside every repository. Place the new immutable signed asset at `dist/<repository-name>-<manifest-version>.kaiplugin`, then run `node scripts/verify-package.js`. The release verifier checks the actual publisher signature and exact source/assets/dependency contents against the same package rules as Core. Its standalone format snapshot and SHA-256 provenance are under `scripts/package-format-v3*`; it never imports or executes submitted plugin code.

CI tests source on `foundation-v1`, pull requests and `main` on Windows, macOS and Linux. It checks any signed asset present for the current version. Publication runs only from `main`, only when that exact signed asset exists, and only after every check passes. Existing release assets must match byte-for-byte and are never overwritten. Branch builds cannot publish releases. Native device/integration checks remain necessary before a release; unit tests do not replace them.

The signed 0.3.0 package is stored in exact byte parts to keep GitHub uploads bounded. Run `node scripts/assemble-signed-package.js` before `node scripts/verify-package.js`; assembly checks each part and the complete SHA-256 without creating or changing a signature.
