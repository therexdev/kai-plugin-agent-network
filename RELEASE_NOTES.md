# 0.3.0 — Foundation plugins

Agent Network now owns its native engine, relay transport, encrypted identity/store and job runtime. It uses Foundation API v1 with package schema 2/API 3 and explicit native-code trust. The full service workspace remains installed separately.

Hosted jobs use an extracted job-only graph engine. Private account, Brain, filesystem/HTTP, tool, schedule and sub-workflow branches are absent. QuickJS bounds, package validation, quote/result commitments and job limits remain enforced. Workflow definitions are copied through a declared attended service call; hosted jobs receive no service SDK.

Data starts fresh in this plugin's directory. Older app files are untouched. Dependencies are locked and bundled before signing, with no npm operations on the user's machine. Free private services remain supported; paid rentals are not enabled.
