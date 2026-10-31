# browserstage

Snapshot-driven browser automation as a CLI and a stdio MCP server
in one bin. Navigate, capture an accessibility snapshot of the
page, then act on elements by the references in that snapshot:
click, hover, drag, drop, type, fill whole forms, select options,
press keys, upload files and handle dialogs. Console messages and
network requests are readable tools, and tabs can be listed,
created, closed and selected.

The browser sits behind an injectable executor interface
(`StageBrowser` in `src/types.ts`). This package bundles no browser
and downloads none: with no executor configured, browser commands
fail with a clear "Browser unavailable" error. Deployments inject
a Playwright-compatible executor to drive a real browser. The
`browser_run_code_unsafe` tool runs arbitrary code against the
page in the original design and keeps that name and its warning
here: only enable it where you would run arbitrary code yourself.

## Install

```bash
npx -y @reneturcios/browserstage mcp
```

## CLI

```bash
browserstage mcp
browserstage navigate <url>
browserstage snapshot
browserstage press <key>
browserstage resize <width> <height>
browserstage --version
```

Exit codes: 0 success, 1 browser error, 2 usage error.

## MCP tools

24 core tools: `browser_navigate`, `browser_navigate_back`,
`browser_snapshot`, `browser_find`, `browser_click`,
`browser_hover`, `browser_drag`, `browser_drop`,
`browser_select_option`, `browser_type`, `browser_press_key`,
`browser_fill_form`, `browser_take_screenshot`,
`browser_run_code_unsafe`, `browser_evaluate`, `browser_wait_for`,
`browser_handle_dialog`, `browser_file_upload`,
`browser_console_messages`, `browser_network_requests`,
`browser_network_request`, `browser_tabs`, `browser_close`,
`browser_resize`.

MCP client config:

```json
{
  "mcpServers": {
    "browserstage": {
      "command": "npx",
      "args": ["-y", "@reneturcios/browserstage", "mcp"]
    }
  }
}
```

## Docker

```bash
docker run -i ghcr.io/cloudcorprecords/browserstage          # MCP server
docker run --rm ghcr.io/cloudcorprecords/browserstage --version
```

## Development

```bash
npm install
npm run build
npm test
```

MIT license.
