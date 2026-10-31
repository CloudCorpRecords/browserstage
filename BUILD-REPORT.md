# browserstage — Build Report

MCP Rebuild 100, Wave 1 Batch 5 (final Tier A batch). Clean-room
rebuild of the "playwright" target from the published Playwright
MCP documentation (capabilities / tool list at playwright.dev).
Local build only — nothing pushed or published.

Identity: repo `browserstage`, npm `@reneturcios/browserstage`,
MCP name `io.github.CloudCorpRecords/browserstage`, version `0.1.0`.

## Files created (19/19 per TEMPLATE.md checklist)

- `package.json` — bin `browserstage: dist/cli.js`, `mcpName` set
- `server.json` — description = **86 chars** (≤100 ✓, verified
  programmatically); npm entry carries `version: 0.1.0`; OCI entry
  `ghcr.io/cloudcorprecords/browserstage:0.1.0` carries **no**
  `version` field (verified programmatically)
- `Dockerfile` — node:20-alpine two-stage, label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/browserstage"`
- `tsconfig.json`, `.gitignore`, `LICENSE` (MIT), `README.md`,
  `CHANGELOG.md` (single 0.1.0 entry, 2026-10-26)
- `src/index.ts`, `src/cli.ts`, `src/mcp.ts`, `src/types.ts`,
  `src/stage.ts` (core + injectable browser interface)
- `test/stage.test.ts`
- `.github/workflows/{ci,publish,publish-container,registry-publish}.yml`

## Implementation notes

- Twenty-four MCP tools, the documented core `browser_*` set:
  navigate, navigate_back, snapshot, find, click, hover, drag,
  drop, select_option, type, press_key, fill_form,
  take_screenshot, run_code_unsafe, evaluate, wait_for,
  handle_dialog, file_upload, console_messages,
  network_requests, network_request, tabs, close, resize.
- **Low-level Server API** with explicit inputSchema literals (not
  McpServer+zod — standing rule). Zod validates `tools/call` args.
- **Browser behind an injectable interface:** all logic runs
  against a `StageBrowser` interface (24 methods). The core owns
  the validation: element/target pairing, `wait_for` requiring at
  least one condition, the tabs action whitelist
  (`list`/`new`/`close`/`select`) with per-action requirements,
  and `fill_form` field shape checks. The default executor fails
  honestly ("Browser unavailable… bundles no browser and downloads
  none"); behaviour is covered by fakes in the unit tests.

## Verification (exact outputs)

- Build: `tsc` exit 0; canonical `dist/` present with `.d.ts` /
  `.js.map`. (Mid-batch the VM write guard truncated an earlier
  dist; stock `tsc` was re-run after the guard lifted and parity +
  tests re-verified against the canonical dist.)
- Tests: `tsx --test` → tests 12, pass 12, fail 0.
- CLI smoke: `node dist/cli.js --version` → `0.1.0`.
- Parity: verdict **PASS**, parity_pct **100.0**, identical_tools
  **24/24**, schema_diffs {} (`parity-out/parity.json`, re-run
  2026-10-26T17:03:12Z against canonical dist). Original side:
  tools-file fixture `harness/fixtures/playwright-tools-original.json`
  (docs-derived, labelled in its `_source`).

## Lockfile status

`package-lock.json` copied from pdfport with identity fields edited
(top-level `name`, root package `name`, bin key). Clean lockfile
regeneration is REQUIRED before publish — Blocker 3 in
SCOREBOARD.md. `node_modules` is a local `cp -a` copy; gitignored.

## Blockers / honest gaps

- **Tool-count discrepancy (flagged, not hidden):** the earlier
  workspace audit counted 25 tools for the original Playwright
  MCP; the published core capabilities list documents 24. The
  25th is an opt-in capability tool outside the published core
  list and was not rebuilt — same class as the allfeatures gap 7.
  Parity is 24/24 against the documented core list.
- **No live browser session was run** (browser downloads fail in
  this VM); behaviour is proven with fake executors only, and
  ground truth is docs-derived, not hand-probed.
- Container build not exercised locally; the publish-container
  workflow smoke-tests initialize/usage at publish time.
- mcpaudit / mcpvet / shipcheck pre-publish gate not run — publish
  wave scope, not claimed here.
