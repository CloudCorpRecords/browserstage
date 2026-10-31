/**
 * browserstage MCP server. The 24 published core tools:
 * browser_navigate, browser_navigate_back, browser_snapshot,
 * browser_find, browser_click, browser_hover, browser_drag,
 * browser_drop, browser_select_option, browser_type,
 * browser_press_key, browser_fill_form, browser_take_screenshot,
 * browser_run_code_unsafe, browser_evaluate, browser_wait_for,
 * browser_handle_dialog, browser_file_upload,
 * browser_console_messages, browser_network_requests,
 * browser_network_request, browser_tabs, browser_close,
 * browser_resize.
 *
 * Why the low-level Server instead of McpServer: the high-level
 * helper converts zod schemas to JSON Schema and injects two keys
 * that are not in this toolset's public spec ("$schema" and
 * "additionalProperties"), which breaks exact tool-list/schema
 * parity with the spec. This file therefore serves tools/list with
 * the spec's exact input schemas, while zod still validates every
 * tools/call argument set.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { BrowserStage, VERSION } from "./stage.js";

const S = z.string();
const NavigateArgs = z.object({ url: S });
const SnapshotArgs = z.object({ target: S.optional(), filename: S.optional(), depth: z.number().optional() });
const FindArgs = z.object({ text: S.optional(), regex: S.optional() });
const ClickArgs = z.object({ element: S, target: S, button: S.optional(), doubleClick: z.boolean().optional() });
const HoverArgs = z.object({ element: S, target: S });
const DragArgs = z.object({ startElement: S, startTarget: S, endElement: S, endTarget: S });
const DropArgs = z.object({ element: S, target: S, paths: z.array(S).optional() });
const SelectArgs = z.object({ target: S, values: z.array(S) });
const TypeArgs = z.object({ element: S, target: S, text: S, submit: z.boolean().optional(), slowly: z.boolean().optional() });
const PressArgs = z.object({ key: S });
const FieldSchema = z.object({ name: S, type: S, value: S, target: S.optional() });
const FillFormArgs = z.object({ fields: z.array(FieldSchema) });
const ScreenshotArgs = z.object({ target: S.optional(), filename: S.optional(), fullPage: z.boolean().optional(), type: S.optional() });
const RunCodeArgs = z.object({ code: S });
const EvaluateArgs = z.object({ function: S, element: S.optional(), target: S.optional() });
const WaitArgs = z.object({ text: S.optional(), textGone: S.optional(), time: z.number().optional() });
const DialogArgs = z.object({ accept: z.boolean(), promptText: S.optional() });
const UploadArgs = z.object({ paths: z.array(S).optional() });
const ConsoleArgs = z.object({ level: S.optional(), all: z.boolean().optional(), filename: S.optional() });
const NetListArgs = z.object({ static: z.boolean().optional(), filename: S.optional() });
const NetReqArgs = z.object({ index: z.number(), filename: S.optional() });
const TabsArgs = z.object({ action: S, index: z.number().optional(), url: S.optional() });
const ResizeArgs = z.object({ width: z.number(), height: z.number() });
const EmptyArgs = z.object({});

const str = { type: "string" as const };
const num = { type: "number" as const };
const bool = { type: "boolean" as const };
const strArr = { type: "array" as const, items: { type: "string" } };
const TOOLS = [
  { name: "browser_navigate", description: "Navigate to a URL", inputSchema: { type: "object" as const, properties: { url: { type: "string", description: "The URL to navigate the page to" } }, required: ["url"] } },
  { name: "browser_navigate_back", description: "Go back to the previous page in the browser history", inputSchema: { type: "object" as const, properties: {}, required: [] } },
  { name: "browser_snapshot", description: "Capture accessibility snapshot of the current page", inputSchema: { type: "object" as const, properties: { depth: { type: "number", description: "Optional maximum depth of the accessibility tree to capture" }, filename: { type: "string", description: "Optional filename to save the snapshot to" }, target: { type: "string", description: "Optional element reference from a page snapshot to scope the snapshot to" } }, required: [] } },
  { name: "browser_find", description: "Search the accessibility snapshot for text or a regular expression", inputSchema: { type: "object" as const, properties: { regex: { type: "string", description: "Optional regular expression to search for in the page snapshot" }, text: { type: "string", description: "Optional text to search for in the page snapshot" } }, required: [] } },
  { name: "browser_click", description: "Perform click on a web page", inputSchema: { type: "object" as const, properties: { button: { type: "string", description: "Optional mouse button to click with: left, right, or middle" }, doubleClick: { type: "boolean", description: "Whether to double click the element" }, element: { type: "string", description: "Human-readable description of the element to click" }, target: { type: "string", description: "Element reference from a page snapshot to click" } }, required: ["element", "target"] } },
  { name: "browser_hover", description: "Hover over an element on the page", inputSchema: { type: "object" as const, properties: { element: { type: "string", description: "Human-readable description of the element to hover over" }, target: { type: "string", description: "Element reference from a page snapshot to hover over" } }, required: ["element", "target"] } },
  { name: "browser_drag", description: "Perform drag and drop between two elements", inputSchema: { type: "object" as const, properties: { endElement: { type: "string", description: "Human-readable description of the element to drop onto" }, endTarget: { type: "string", description: "Element reference of the element to drop onto" }, startElement: { type: "string", description: "Human-readable description of the element to drag from" }, startTarget: { type: "string", description: "Element reference of the element to drag from" } }, required: ["startElement", "startTarget", "endElement", "endTarget"] } },
  { name: "browser_drop", description: "Drop files or data onto an element on the page", inputSchema: { type: "object" as const, properties: { element: { type: "string", description: "Human-readable description of the element to drop onto" }, paths: { type: "array", items: { type: "string" }, description: "Optional file paths to drop onto the element" }, target: { type: "string", description: "Element reference of the element to drop onto" } }, required: ["element", "target"] } },
  { name: "browser_select_option", description: "Select an option in a dropdown", inputSchema: { type: "object" as const, properties: { target: { type: "string", description: "Element reference of the dropdown to select an option in" }, values: { type: "array", items: { type: "string" }, description: "The option values to select in the dropdown" } }, required: ["target", "values"] } },
  { name: "browser_type", description: "Type text into an editable element", inputSchema: { type: "object" as const, properties: { element: { type: "string", description: "Human-readable description of the editable element to type into" }, slowly: { type: "boolean", description: "Whether to type the text one character at a time" }, submit: { type: "boolean", description: "Whether to press Enter after typing" }, target: { type: "string", description: "Element reference of the element to type into" }, text: { type: "string", description: "The text to type into the element" } }, required: ["element", "target", "text"] } },
  { name: "browser_press_key", description: "Press a key on the keyboard", inputSchema: { type: "object" as const, properties: { key: { type: "string", description: "The key to press, such as Enter, ArrowDown, or a single character" } }, required: ["key"] } },
  { name: "browser_fill_form", description: "Fill multiple form fields", inputSchema: { type: "object" as const, properties: { fields: { type: "array", description: "The form fields to fill; each field carries a name, a type, a value, and an optional element target" } }, required: ["fields"] } },
  { name: "browser_take_screenshot", description: "Take a screenshot of the current page", inputSchema: { type: "object" as const, properties: { filename: { type: "string", description: "Optional filename to save the screenshot to" }, fullPage: { type: "boolean", description: "Whether to capture the full scrollable page instead of the viewport" }, target: { type: "string", description: "Optional element reference from a page snapshot to screenshot instead of the page" }, type: { type: "string", description: "Optional image format of the screenshot, such as png or jpeg" } }, required: [] } },
  { name: "browser_run_code_unsafe", description: "Run a Playwright code snippet against the current page (unsafe: arbitrary code execution)", inputSchema: { type: "object" as const, properties: { code: { type: "string", description: "The Playwright code snippet to run against the current page" } }, required: ["code"] } },
  { name: "browser_evaluate", description: "Evaluate JavaScript expression on the page or on an element", inputSchema: { type: "object" as const, properties: { element: { type: "string", description: "Optional human-readable description of the element to evaluate on" }, function: { type: "string", description: "The JavaScript function to evaluate on the page or on an element" }, target: { type: "string", description: "Optional element reference to evaluate the function on" } }, required: ["function"] } },
  { name: "browser_wait_for", description: "Wait for text to appear or disappear, or for a specified time to pass", inputSchema: { type: "object" as const, properties: { text: { type: "string", description: "Optional text to wait for the page to contain" }, textGone: { type: "string", description: "Optional text to wait for the page to no longer contain" }, time: { type: "number", description: "Optional time in seconds to wait" } }, required: [] } },
  { name: "browser_handle_dialog", description: "Handle a browser dialog", inputSchema: { type: "object" as const, properties: { accept: { type: "boolean", description: "Whether to accept the dialog (true) or dismiss it (false)" }, promptText: { type: "string", description: "Optional text to enter into a prompt dialog" } }, required: ["accept"] } },
  { name: "browser_file_upload", description: "Upload one or multiple files", inputSchema: { type: "object" as const, properties: { paths: { type: "array", items: { type: "string" }, description: "Optional file paths to upload; when omitted, an open file chooser is cancelled" } }, required: [] } },
  { name: "browser_console_messages", description: "Returns all console messages", inputSchema: { type: "object" as const, properties: { all: { type: "boolean", description: "Whether to return console messages for all frames, not just the current page" }, filename: { type: "string", description: "Optional filename to save the console messages to" }, level: { type: "string", description: "Optional console message level to return: info, warning, error, or debug" } }, required: [] } },
  { name: "browser_network_requests", description: "Returns a numbered list of network requests since loading the page", inputSchema: { type: "object" as const, properties: { filename: { type: "string", description: "Optional filename to save the request list to" }, static: { type: "boolean", description: "Optional flag to filter the list by static resource requests" } }, required: [] } },
  { name: "browser_network_request", description: "Returns the full details of a single network request", inputSchema: { type: "object" as const, properties: { filename: { type: "string", description: "Optional filename to save the request details to" }, index: { type: "number", description: "The index of the network request in the browser_network_requests list" } }, required: ["index"] } },
  { name: "browser_tabs", description: "List, create, close, or select a browser tab", inputSchema: { type: "object" as const, properties: { action: { type: "string", description: "The tab action to perform: list, new, close, or select" }, index: { type: "number", description: "Optional index of the tab for the close and select actions" }, url: { type: "string", description: "Optional URL to open when the action is new" } }, required: ["action"] } },
  { name: "browser_close", description: "Close the current page and the browser", inputSchema: { type: "object" as const, properties: {}, required: [] } },
  { name: "browser_resize", description: "Resize the browser window", inputSchema: { type: "object" as const, properties: { height: { type: "number", description: "The new browser window height in pixels" }, width: { type: "number", description: "The new browser window width in pixels" } }, required: ["width", "height"] } },
];

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
}
function errorResult(err: unknown) {
  return { content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }], isError: true };
}

const stage = new BrowserStage();
const server = new Server({ name: "browserstage", version: VERSION }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "browser_navigate": return textResult(await stage.navigate(NavigateArgs.parse(args ?? {}).url));
      case "browser_navigate_back": EmptyArgs.parse(args ?? {}); return textResult(await stage.navigateBack());
      case "browser_snapshot": return textResult(await stage.snapshot(SnapshotArgs.parse(args ?? {})));
      case "browser_find": return textResult(await stage.find(FindArgs.parse(args ?? {})));
      case "browser_click": return textResult(await stage.click(ClickArgs.parse(args ?? {})));
      case "browser_hover": { const p = HoverArgs.parse(args ?? {}); return textResult(await stage.hover(p.element, p.target)); }
      case "browser_drag": return textResult(await stage.drag(DragArgs.parse(args ?? {})));
      case "browser_drop": return textResult(await stage.drop(DropArgs.parse(args ?? {})));
      case "browser_select_option": { const p = SelectArgs.parse(args ?? {}); return textResult(await stage.selectOption(p.target, p.values)); }
      case "browser_type": return textResult(await stage.type(TypeArgs.parse(args ?? {})));
      case "browser_press_key": return textResult(await stage.pressKey(PressArgs.parse(args ?? {}).key));
      case "browser_fill_form": return textResult(await stage.fillForm(FillFormArgs.parse(args ?? {}).fields));
      case "browser_take_screenshot": return textResult(await stage.takeScreenshot(ScreenshotArgs.parse(args ?? {})));
      case "browser_run_code_unsafe": return textResult(await stage.runCode(RunCodeArgs.parse(args ?? {}).code));
      case "browser_evaluate": return textResult(await stage.evaluate(EvaluateArgs.parse(args ?? {})));
      case "browser_wait_for": return textResult(await stage.waitFor(WaitArgs.parse(args ?? {})));
      case "browser_handle_dialog": return textResult(await stage.handleDialog(DialogArgs.parse(args ?? {})));
      case "browser_file_upload": return textResult(await stage.fileUpload(UploadArgs.parse(args ?? {}).paths));
      case "browser_console_messages": return textResult(await stage.consoleMessages(ConsoleArgs.parse(args ?? {})));
      case "browser_network_requests": return textResult(await stage.networkRequests(NetListArgs.parse(args ?? {})));
      case "browser_network_request": { const p = NetReqArgs.parse(args ?? {}); return textResult(await stage.networkRequest(p.index, p.filename)); }
      case "browser_tabs": return textResult(await stage.tabs(TabsArgs.parse(args ?? {})));
      case "browser_close": EmptyArgs.parse(args ?? {}); return textResult(await stage.close());
      case "browser_resize": { const p = ResizeArgs.parse(args ?? {}); return textResult(await stage.resize(p.width, p.height)); }
    }
  } catch (err) { return errorResult(err); }
  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});

async function main(): Promise<void> { await server.connect(new StdioServerTransport()); }
void main();
