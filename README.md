# KAI Agent Network

A sandboxed KAI Core plugin for private agent services. Build a service from a local model or a compatible saved workflow, export its signed invitation, and run real free jobs through Core's isolated workflow engine. No Brain, connected-account credentials, wallet keys, or arbitrary native commands are exposed to service jobs or the renderer.

Requires KAI Core with plugin API 2. Install the signed `.kaiplugin` release through Core's Plugins page and review its capabilities. The `plugin/` directory contains the complete sandboxed renderer; privileged operations are implemented in the reviewed `electron/plugin-services/agent-network.js` broker in `therexdev/kai-core`.

## Use

1. In **Connection**, start a session. Leave relay addresses empty for local service tests. A separate encrypted service identity is created; it is not your wallet identity.
2. In **My services**, select an installed local model and save a service. Connection check runs without a model. Customize instructions or copy a compatible saved workflow from the Workflows plugin.
3. Select **Test locally**, enter input, request a free quote, then **Review & run**. Inspect the returned result and accept or reject it.
4. Export a signed invitation for sharing, or configure a compatible HTTPS Agent Network relay and explicitly publish the service card. Enable **Accept jobs** to host requests while the plugin remains open.
5. In **Discover**, search configured relays or import an invitation. External jobs require compatible reachable relays. Core's Local-Only privacy setting blocks relay traffic.

No public directory is preconfigured. This release does not deploy or connect marketplace contracts, process paid rentals or escrow, transfer KAI, or create mainnet reputation. A successful local test proves the local job path only. Remote operation requires a compatible relay and host; publication is shown only after a relay accepts it.

## Data and limits

Core reuses the existing encrypted `agent-network.json` within the shared profile. It never imports private keys into the plugin, silently replaces unreadable state, or starts CompanionHub. Existing services and jobs stay in place. A reopened plugin starts paused until you explicitly start a session; closing it stops its polling and model work.

New services accept up to 12 KB of text and are bounded to 180 seconds, 40 execution steps, 12 model calls, and 64 KB of output. Only reviewed local graph actions are allowed. Brain/account/HTTP/code/scheduled/sub-workflow actions cannot be published from this plugin. Services with these actions remain saved but require revision before use. Copying a workflow creates an independent service version. Workflow edits do not silently change a published service.

Invitations contain the public service address, description, limits, schemas, and relay addresses. They expire after seven days. Exported workflow packages also contain your instructions; share them only intentionally. Job summaries omit input and full definitions; selected results can be viewed separately. No payment is made when accepting a free result.

## Capabilities

- `models.read`: installed local model names and readiness.
- `agent-network.read`: service summaries, selected results, signed invitations, and explicit workflow exports.
- `agent-network.write`: save local service definitions, import signed invitations, or copy selected compatible workflows.
- `agent-network.manage`: review session/hosting settings and job actions.
- `agent-network.network`: connect only through Core's reviewed private-service protocol for configured discovery, publication, and encrypted jobs. It does not grant renderer network access.

The broker uses exact method allowlists, native confirmations for consequential service actions, the OS keychain, bounded network requests, SSRF defenses, signed protocol messages, and the Core privacy setting. The renderer uses only `window.kai.call`; its CSP disallows network, inline scripts, and arbitrary navigation.

## Development

Run `npm test` for renderer/package contract checks. The Core repository contains real broker lifecycle and local job tests in `core/test-core/plugin-agent-network.test.js`; run `node --test core/test-core/plugin-agent-network.test.js` there. Existing `core/test/agent-network.test.js` covers protocol verification, relay exchange, job isolation, and restart behavior.

Release packages are generated and signed by the owner through KAI Core's packaging tooling. Publisher private keys must never be added to this repository. Source alone is not an installable signed release.
