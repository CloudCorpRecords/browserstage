/**
 * browserstage core: the 24 published core browser tools over an
 * injectable StageBrowser.
 *
 * The core owns the validation and bookkeeping that do not need a
 * browser: URL parsing, the element/target pairing rule (snapshot
 * tools address elements by description + target reference),
 * wait_for's at-least-one-condition rule, the tab action whitelist,
 * fill_form's non-empty rule, and a record of the current URL and
 * open screenshot/console state. Everything else delegates.
 *
 * The default browser bundles nothing and downloads nothing: each
 * call fails with a clear error, the same honest failure the
 * original server gives when its browser cannot start.
 */
import type {
  ClickOptions, ConsoleOptions, DialogOptions, DragOptions, DropOptions,
  EvaluateOptions, FindOptions, FormField, NetworkListOptions,
  ScreenshotOptions, SnapshotOptions, StageBrowser, TabsOptions,
  TypeOptions, WaitOptions,
} from "./types.js";

export const VERSION = "0.1.0";

const UNAVAILABLE = "Browser unavailable: browserstage bundles no browser and downloads none. Inject a Playwright-compatible StageBrowser, or run in an environment that provides one.";

export class UnavailableStageBrowser implements StageBrowser {
  private fail(): never { throw new Error(UNAVAILABLE); }
  async navigate(): Promise<string> { return this.fail(); }
  async navigateBack(): Promise<string> { return this.fail(); }
  async snapshot(): Promise<string> { return this.fail(); }
  async find(): Promise<string> { return this.fail(); }
  async click(): Promise<string> { return this.fail(); }
  async hover(): Promise<string> { return this.fail(); }
  async drag(): Promise<string> { return this.fail(); }
  async drop(): Promise<string> { return this.fail(); }
  async selectOption(): Promise<string> { return this.fail(); }
  async type(): Promise<string> { return this.fail(); }
  async pressKey(): Promise<string> { return this.fail(); }
  async fillForm(): Promise<string> { return this.fail(); }
  async takeScreenshot(): Promise<string> { return this.fail(); }
  async runCode(): Promise<string> { return this.fail(); }
  async evaluate(): Promise<unknown> { return this.fail(); }
  async waitFor(): Promise<string> { return this.fail(); }
  async handleDialog(): Promise<string> { return this.fail(); }
  async fileUpload(): Promise<string> { return this.fail(); }
  async consoleMessages(): Promise<unknown> { return this.fail(); }
  async networkRequests(): Promise<unknown> { return this.fail(); }
  async networkRequest(): Promise<unknown> { return this.fail(); }
  async tabs(): Promise<unknown> { return this.fail(); }
  async close(): Promise<string> { return this.fail(); }
  async resize(): Promise<string> { return this.fail(); }
}

const TAB_ACTIONS = ["list", "new", "close", "select"];

export class BrowserStage {
  private readonly browser: StageBrowser;
  private currentUrl: string | null = null;
  constructor(browser: StageBrowser = new UnavailableStageBrowser()) { this.browser = browser; }
  get url(): string | null { return this.currentUrl; }

  private pair(element: string, target: string): void {
    if (!element) throw new Error("element (human-readable description) is required");
    if (!target) throw new Error("target (element reference from a snapshot) is required");
  }

  async navigate(url: string): Promise<string> {
    try { new URL(url); } catch { throw new Error(`Invalid URL: ${url}`); }
    const msg = await this.browser.navigate(url);
    this.currentUrl = url;
    return msg;
  }
  async navigateBack(): Promise<string> { return this.browser.navigateBack(); }
  async snapshot(opts: SnapshotOptions = {}): Promise<string> { return this.browser.snapshot(opts); }
  async find(opts: FindOptions): Promise<string> {
    if (!opts.text && !opts.regex) throw new Error("browser_find needs text or regex");
    return this.browser.find(opts);
  }
  async click(opts: ClickOptions): Promise<string> { this.pair(opts.element, opts.target); return this.browser.click(opts); }
  async hover(element: string, target: string): Promise<string> { this.pair(element, target); return this.browser.hover(element, target); }
  async drag(opts: DragOptions): Promise<string> {
    this.pair(opts.startElement, opts.startTarget); this.pair(opts.endElement, opts.endTarget);
    return this.browser.drag(opts);
  }
  async drop(opts: DropOptions): Promise<string> { this.pair(opts.element, opts.target); return this.browser.drop(opts); }
  async selectOption(target: string, values: string[]): Promise<string> {
    if (!target) throw new Error("target is required");
    if (!values || values.length === 0) throw new Error("values must list at least one option");
    return this.browser.selectOption(target, values);
  }
  async type(opts: TypeOptions): Promise<string> { this.pair(opts.element, opts.target); return this.browser.type(opts); }
  async pressKey(key: string): Promise<string> {
    if (!key) throw new Error("key is required");
    return this.browser.pressKey(key);
  }
  async fillForm(fields: FormField[]): Promise<string> {
    if (!fields || fields.length === 0) throw new Error("fields must list at least one field");
    for (const f of fields) if (!f.name || !f.type) throw new Error("each field needs a name and a type");
    return this.browser.fillForm(fields);
  }
  async takeScreenshot(opts: ScreenshotOptions = {}): Promise<string> { return this.browser.takeScreenshot(opts); }
  async runCode(code: string): Promise<string> {
    if (!code) throw new Error("code is required");
    return this.browser.runCode(code);
  }
  async evaluate(opts: EvaluateOptions): Promise<unknown> {
    if (!opts.function) throw new Error("function is required");
    return this.browser.evaluate(opts);
  }
  async waitFor(opts: WaitOptions): Promise<string> {
    if (opts.text === undefined && opts.textGone === undefined && opts.time === undefined) {
      throw new Error("browser_wait_for needs text, textGone or time");
    }
    if (opts.time !== undefined && opts.time < 0) throw new Error("time must be >= 0");
    return this.browser.waitFor(opts);
  }
  async handleDialog(opts: DialogOptions): Promise<string> {
    if (typeof opts.accept !== "boolean") throw new Error("accept (boolean) is required");
    return this.browser.handleDialog(opts);
  }
  async fileUpload(paths?: string[]): Promise<string> { return this.browser.fileUpload(paths); }
  async consoleMessages(opts: ConsoleOptions = {}): Promise<unknown> { return this.browser.consoleMessages(opts); }
  async networkRequests(opts: NetworkListOptions = {}): Promise<unknown> { return this.browser.networkRequests(opts); }
  async networkRequest(index: number, filename?: string): Promise<unknown> {
    if (!Number.isInteger(index) || index < 0) throw new Error("index must be a non-negative integer");
    return this.browser.networkRequest(index, filename);
  }
  async tabs(opts: TabsOptions): Promise<unknown> {
    if (!TAB_ACTIONS.includes(opts.action)) throw new Error(`browser_tabs action must be one of ${TAB_ACTIONS.join(", ")}; got: ${opts.action}`);
    if (opts.action === "new" && !opts.url) throw new Error("browser_tabs action 'new' needs a url");
    if ((opts.action === "close" || opts.action === "select") && opts.index === undefined) {
      throw new Error(`browser_tabs action '${opts.action}' needs an index`);
    }
    return this.browser.tabs(opts);
  }
  async close(): Promise<string> { const msg = await this.browser.close(); this.currentUrl = null; return msg; }
  async resize(width: number, height: number): Promise<string> {
    if (width <= 0 || height <= 0) throw new Error("width and height must be > 0");
    return this.browser.resize(width, height);
  }
}
