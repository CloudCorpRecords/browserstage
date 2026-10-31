/**
 * browserstage types.
 *
 * Every tool drives the page only through the StageBrowser
 * interface, so the full tool surface is exercisable with a fake
 * browser in tests. The default executor (in stage.ts) bundles no
 * browser and downloads none: it fails every call with a clear
 * "no browser configured" error.
 */

/** One field of a browser_fill_form call. */
export interface FormField {
  name: string;
  type: string;
  value: string;
  target?: string;
}

export interface SnapshotOptions { target?: string; filename?: string; depth?: number }
export interface FindOptions { text?: string; regex?: string }
export interface ClickOptions { element: string; target: string; button?: string; doubleClick?: boolean }
export interface DragOptions { startElement: string; startTarget: string; endElement: string; endTarget: string }
export interface DropOptions { element: string; target: string; paths?: string[] }
export interface TypeOptions { element: string; target: string; text: string; submit?: boolean; slowly?: boolean }
export interface ScreenshotOptions { target?: string; filename?: string; fullPage?: boolean; type?: string }
export interface EvaluateOptions { function: string; element?: string; target?: string }
export interface WaitOptions { text?: string; textGone?: string; time?: number }
export interface DialogOptions { accept: boolean; promptText?: string }
export interface ConsoleOptions { level?: string; all?: boolean; filename?: string }
export interface NetworkListOptions { static?: boolean; filename?: string }
export interface TabsOptions { action: string; index?: number; url?: string }

/**
 * A snapshot-driven page driver (Playwright-style): elements are
 * addressed by a human description plus a target reference taken
 * from an accessibility snapshot.
 */
export interface StageBrowser {
  navigate(url: string): Promise<string>;
  navigateBack(): Promise<string>;
  snapshot(opts: SnapshotOptions): Promise<string>;
  find(opts: FindOptions): Promise<string>;
  click(opts: ClickOptions): Promise<string>;
  hover(element: string, target: string): Promise<string>;
  drag(opts: DragOptions): Promise<string>;
  drop(opts: DropOptions): Promise<string>;
  selectOption(target: string, values: string[]): Promise<string>;
  type(opts: TypeOptions): Promise<string>;
  pressKey(key: string): Promise<string>;
  fillForm(fields: FormField[]): Promise<string>;
  takeScreenshot(opts: ScreenshotOptions): Promise<string>;
  runCode(code: string): Promise<string>;
  evaluate(opts: EvaluateOptions): Promise<unknown>;
  waitFor(opts: WaitOptions): Promise<string>;
  handleDialog(opts: DialogOptions): Promise<string>;
  fileUpload(paths?: string[]): Promise<string>;
  consoleMessages(opts: ConsoleOptions): Promise<unknown>;
  networkRequests(opts: NetworkListOptions): Promise<unknown>;
  networkRequest(index: number, filename?: string): Promise<unknown>;
  tabs(opts: TabsOptions): Promise<unknown>;
  close(): Promise<string>;
  resize(width: number, height: number): Promise<string>;
}
