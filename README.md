# KAI Agent Network

The original Agent Network workspace, installed separately in KAI Core. **Discover**, **My agents**, **Jobs**, **Earnings**, **Activity**, and **Network settings** retain the original screens, controls, service editor, signed invitations, job receipts, and Core service engine.

## Use

Enable Agent Network in **Network settings**, then create an agent from an original template or a compatible saved workflow. Test it locally, review the quote, send the selected input, inspect the full delivery, and accept or reject the result. Use **Open workflow builder** to open the separate Workflows plugin.

Configure compatible HTTPS relays to publish a service card, discover other services, and accept external requests. No directory is silently selected. Local-Only blocks relay traffic. Signed invitations and results save through native file dialogs.

The full original job view includes input, quote, result, integrity hash, execution steps, pending reviews, errors and activity. Original structured inputs/output schemas are supported. A previously enabled service resumes when Core starts with this plugin installed and enabled, and keeps working when its window is closed. Disabling/uninstalling the plugin or quitting Core stops it.

## Isolation and deployment

The original service-package validator permits local reasoning, bounded JavaScript, transformations, branching, looping and review. Hosted jobs cannot access private Brain, connected accounts, wallet keys, native desktop actions, schedules, or other workflows. A copied graph becomes an independent reviewed service version; later private workflow changes do not modify it.

Core reuses the existing encrypted `agent-network.json` and preserves unreadable or externally changed data. The renderer receives its own full service definitions and job records, but never the private service identity. All external protocol operations remain in Core's reviewed, publisher-pinned broker.

Paid services were not enabled in the original deployment and remain unavailable. The original Earnings screen explains this. Free jobs make no payment and earn no paid-service reputation. Remote operation requires reachable compatible relays and hosts.

## Source and checks

Original UI source: `therexdev/kaiapp` commit `34d17faa0526213b8fc0ac7a65aa7f2c186c6547`, `ui/agent-network.js` and original styles. Changes are confined to the plugin bridge, native save-file transport, separate-window shell and dismissible notices.

Run `npm test` here. In Core, run `node --test core/test-core/plugin-agent-network.test.js core/test-core/plugin-agent-network-parity.test.js`. The signed-plugin desktop smoke covers the original six-section navigation, agent editor, signed quote, isolated local execution, full delivery and acceptance. Synthetic tests do not establish live relay availability or native OS keychain migration.

Install the signed `.kaiplugin` release through the matching Core version. Signing keys stay outside this repository.
