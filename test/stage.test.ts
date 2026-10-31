import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BrowserStage } from "../src/stage.js";
import type { StageBrowser } from "../src/types.js";

class FakeBrowser implements StageBrowser {
  calls: string[] = [];
  async navigate(url: string) { this.calls.push(`navigate:${url}`); return `Navigated to ${url}`; }
  async navigateBack() { this.calls.push("back"); return "Went back"; }
  async snapshot() { this.calls.push("snapshot"); return "- heading \"Home\" [ref=e1]"; }
  async find(o: { text?: string; regex?: string }) { this.calls.push(`find:${o.text ?? o.regex}`); return "1 match"; }
  async click(o: { element: string; target: string }) { this.calls.push(`click:${o.target}`); return "Clicked"; }
  async hover(e: string, t: string) { this.calls.push(`hover:${t}`); return "Hovered"; }
  async drag() { this.calls.push("drag"); return "Dragged"; }
  async drop() { this.calls.push("drop"); return "Dropped"; }
  async selectOption(t: string, v: string[]) { this.calls.push(`select:${t}=${v.join(",")}`); return "Selected"; }
  async type(o: { text: string }) { this.calls.push(`type:${o.text}`); return "Typed"; }
  async pressKey(k: string) { this.calls.push(`press:${k}`); return `Pressed ${k}`; }
  async fillForm(f: unknown[]) { this.calls.push(`fillForm:${f.length}`); return "Filled"; }
  async takeScreenshot() { this.calls.push("screenshot"); return "shot.png"; }
  async runCode(c: string) { this.calls.push(`runCode:${c.length}`); return "Ran"; }
  async evaluate() { this.calls.push("evaluate"); return "title text"; }
  async waitFor() { this.calls.push("wait"); return "Waited"; }
  async handleDialog(o: { accept: boolean }) { this.calls.push(`dialog:${o.accept}`); return "Handled"; }
  async fileUpload(p?: string[]) { this.calls.push(`upload:${(p ?? []).length}`); return "Uploaded"; }
  async consoleMessages() { this.calls.push("console"); return [{ type: "log", text: "hi" }]; }
  async networkRequests() { this.calls.push("netlist"); return [{ index: 0, url: "https://x.test/" }]; }
  async networkRequest(i: number) { this.calls.push(`netreq:${i}`); return { index: i, status: 200 }; }
  async tabs(o: { action: string }) { this.calls.push(`tabs:${o.action}`); return [{ index: 0, url: "https://x.test/" }]; }
  async close() { this.calls.push("close"); return "Closed"; }
  async resize(w: number, h: number) { this.calls.push(`resize:${w}x${h}`); return "Resized"; }
}

describe("browserstage core", () => {
  it("navigate validates the URL, delegates and records it", async () => {
    const fake = new FakeBrowser(); const stage = new BrowserStage(fake);
    assert.equal(await stage.navigate("https://example.com/"), "Navigated to https://example.com/");
    assert.equal(stage.url, "https://example.com/");
    await assert.rejects(() => stage.navigate("::bad"), /Invalid URL/);
  });
  it("snapshot and find delegate; find needs text or regex", async () => {
    const stage = new BrowserStage(new FakeBrowser());
    assert.match(await stage.snapshot(), /heading/);
    assert.equal(await stage.find({ text: "Home" }), "1 match");
    await assert.rejects(() => stage.find({}), /needs text or regex/);
  });
  it("click/hover/type enforce the element+target pairing", async () => {
    const stage = new BrowserStage(new FakeBrowser());
    assert.equal(await stage.click({ element: "Save button", target: "e12" }), "Clicked");
    await assert.rejects(() => stage.click({ element: "", target: "e12" }), /element .* is required/);
    await assert.rejects(() => stage.hover("Menu", ""), /target .* is required/);
    assert.equal(await stage.type({ element: "Search", target: "e3", text: "hi" }), "Typed");
  });
  it("drag pairs both endpoints; drop delegates with paths", async () => {
    const fake = new FakeBrowser(); const stage = new BrowserStage(fake);
    assert.equal(await stage.drag({ startElement: "Card", startTarget: "e1", endElement: "Column", endTarget: "e2" }), "Dragged");
    await assert.rejects(() => stage.drag({ startElement: "Card", startTarget: "e1", endElement: "", endTarget: "e2" }), /element/);
    assert.equal(await stage.drop({ element: "Zone", target: "e9", paths: ["/tmp/a.png"] }), "Dropped");
  });
  it("selectOption needs a target and at least one value", async () => {
    const stage = new BrowserStage(new FakeBrowser());
    assert.equal(await stage.selectOption("e5", ["a", "b"]), "Selected");
    await assert.rejects(() => stage.selectOption("e5", []), /at least one option/);
    await assert.rejects(() => stage.selectOption("", ["a"]), /target is required/);
  });
  it("pressKey, fillForm validation and happy path", async () => {
    const stage = new BrowserStage(new FakeBrowser());
    assert.equal(await stage.pressKey("Enter"), "Pressed Enter");
    await assert.rejects(() => stage.pressKey(""), /key is required/);
    assert.equal(await stage.fillForm([{ name: "Email", type: "textbox", value: "a@b.c" }]), "Filled");
    await assert.rejects(() => stage.fillForm([]), /at least one field/);
    await assert.rejects(() => stage.fillForm([{ name: "", type: "textbox", value: "x" } as never]), /name and a type/);
  });
  it("screenshot, runCode and evaluate delegate with validation", async () => {
    const stage = new BrowserStage(new FakeBrowser());
    assert.equal(await stage.takeScreenshot({ fullPage: true }), "shot.png");
    assert.equal(await stage.runCode("await page.title()"), "Ran");
    await assert.rejects(() => stage.runCode(""), /code is required/);
    assert.equal(await stage.evaluate({ function: "() => document.title" }), "title text");
    await assert.rejects(() => stage.evaluate({ function: "" }), /function is required/);
  });
  it("waitFor needs a condition and a non-negative time", async () => {
    const stage = new BrowserStage(new FakeBrowser());
    assert.equal(await stage.waitFor({ text: "Done" }), "Waited");
    assert.equal(await stage.waitFor({ time: 2 }), "Waited");
    await assert.rejects(() => stage.waitFor({}), /needs text, textGone or time/);
    await assert.rejects(() => stage.waitFor({ time: -1 }), />= 0/);
  });
  it("dialog, upload, console and network tools delegate", async () => {
    const stage = new BrowserStage(new FakeBrowser());
    assert.equal(await stage.handleDialog({ accept: true }), "Handled");
    assert.equal(await stage.fileUpload(["/tmp/a.png"]), "Uploaded");
    assert.equal(await stage.fileUpload(), "Uploaded");
    assert.deepEqual(await stage.consoleMessages({ level: "error" }), [{ type: "log", text: "hi" }]);
    assert.deepEqual(await stage.networkRequest(0), { index: 0, status: 200 });
    await assert.rejects(() => stage.networkRequest(-1), /non-negative integer/);
  });
  it("tabs enforces the action whitelist and per-action requirements", async () => {
    const stage = new BrowserStage(new FakeBrowser());
    assert.ok(Array.isArray(await stage.tabs({ action: "list" })));
    await assert.rejects(() => stage.tabs({ action: "explode" }), /must be one of/);
    await assert.rejects(() => stage.tabs({ action: "new" }), /needs a url/);
    await assert.rejects(() => stage.tabs({ action: "close" }), /needs an index/);
    assert.ok(Array.isArray(await stage.tabs({ action: "new", url: "https://x.test/" })));
  });
  it("close clears the recorded URL; resize validates dimensions", async () => {
    const stage = new BrowserStage(new FakeBrowser());
    await stage.navigate("https://example.com/");
    assert.equal(await stage.close(), "Closed");
    assert.equal(stage.url, null);
    assert.equal(await stage.resize(1280, 720), "Resized");
    await assert.rejects(() => stage.resize(0, 720), /> 0/);
  });
  it("the default browser fails honestly with no browser configured", async () => {
    const stage = new BrowserStage();
    await assert.rejects(() => stage.navigate("https://example.com/"), /Browser unavailable/);
    await assert.rejects(() => stage.snapshot(), /Browser unavailable/);
  });
});
