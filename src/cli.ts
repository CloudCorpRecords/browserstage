#!/usr/bin/env node
/**
 * browserstage CLI.
 *
 *   browserstage mcp
 *   browserstage navigate <url>
 *   browserstage snapshot
 *   browserstage press <key>
 *   browserstage resize <width> <height>
 *   browserstage --version
 *
 * Exit codes: 0 success, 1 browser error, 2 usage error. Without a
 * configured browser executor the browser commands fail with the
 * core's "Browser unavailable" message (exit 1), never a fake page.
 */
import { BrowserStage, VERSION } from "./stage.js";

function usage(): never {
  console.error(`Usage:
  browserstage mcp
  browserstage navigate <url>
  browserstage snapshot
  browserstage press <key>
  browserstage resize <width> <height>
  browserstage --version`);
  process.exit(2);
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "--version" || cmd === "-v") { console.log(VERSION); return; }
  if (cmd === "mcp") { await import("./mcp.js"); return; }
  if (!cmd) usage();
  try {
    const stage = new BrowserStage();
    if (cmd === "navigate") {
      const [url] = rest; if (!url) usage();
      console.log(await stage.navigate(url));
    } else if (cmd === "snapshot") {
      console.log(await stage.snapshot());
    } else if (cmd === "press") {
      const [key] = rest; if (!key) usage();
      console.log(await stage.pressKey(key));
    } else if (cmd === "resize") {
      const [w, h] = rest; if (!w || !h) usage();
      console.log(await stage.resize(Number(w), Number(h)));
    } else usage();
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
void main();
