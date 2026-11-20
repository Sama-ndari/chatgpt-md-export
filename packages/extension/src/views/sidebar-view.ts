import * as vscode from "vscode";
import { describeOutputRoot, readConfig } from "../config.js";
import type { ExportHistory, ExportRecord } from "../exports-history.js";
import type { RatingPrompt } from "../rating-prompt.js";
import type { TokenStore } from "../secrets.js";
import { onBusyChanged } from "../ui/busy.js";
import { describeExport, sidebarStrings } from "./sidebar-strings.js";

export const SIDEBAR_VIEW_ID = "chatgptMdExport.sidebar";

interface WebviewMessage {
  type: string;
  id?: string;
}

const ACTION_COMMANDS: Record<string, string> = {
  exportUrl: "chatgptMdExport.exportFromUrl",
  exportArchive: "chatgptMdExport.exportFromArchive",
  setToken: "chatgptMdExport.setToken",
  clearToken: "chatgptMdExport.clearToken",
  tokenHelp: "chatgptMdExport.openTokenHelp",
  review: "chatgptMdExport.rate"
};

const RECORD_COMMANDS: Record<string, string> = {
  open: "chatgptMdExport.openExport",
  markdown: "chatgptMdExport.openMarkdown",
  folder: "chatgptMdExport.revealFolder",
  forget: "chatgptMdExport.forgetExport"
};

/** The Activity Bar panel. A webview, so it can look like a real panel. */
export class SidebarViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly history: ExportHistory,
    private readonly tokens: TokenStore,
    private readonly rating: RatingPrompt
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")]
    };
    view.webview.html = this.renderHtml(view.webview);
    view.webview.onDidReceiveMessage((message: WebviewMessage) => {
      void this.handleMessage(message);
    });
    view.onDidChangeVisibility(() => {
      if (view.visible) void this.refresh();
    });
    onBusyChanged((busy) => {
      void view.webview.postMessage({ type: "busy", payload: busy });
    });
  }

  async refresh(): Promise<void> {
    if (!this.view) return;
    await this.view.webview.postMessage({
      type: "state",
      payload: {
        hasToken: Boolean(await this.tokens.read()),
        exports: this.history.list().map(toViewModel),
        outputRoot: describeOutputRoot(readConfig()),
        showRating: this.rating.shouldAsk(this.history.list().length),
        text: sidebarStrings()
      }
    });
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    if (message.type === "ready") {
      await this.refresh();
      return;
    }
    if (message.type === "dismissRating") {
      await this.rating.dismiss();
      await this.refresh();
      return;
    }
    const simple = ACTION_COMMANDS[message.type];
    if (simple) {
      await vscode.commands.executeCommand(simple);
      return;
    }
    const withRecord = RECORD_COMMANDS[message.type];
    const record = this.history.list().find((entry) => entry.outputDir === message.id);
    if (withRecord && record) await vscode.commands.executeCommand(withRecord, record);
  }

  private renderHtml(webview: vscode.Webview): string {
    const nonce = createNonce();
    const asset = (file: string): vscode.Uri =>
      webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "media", file));

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
<link href="${asset("sidebar.css").toString()}" rel="stylesheet" />
<title>ChatGPT Export</title>
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" src="${asset("sidebar.js").toString()}"></script>
</body>
</html>`;
  }
}

function toViewModel(record: ExportRecord): Record<string, string> {
  return {
    id: record.outputDir,
    title: record.title,
    subtitle: describeExport(record.messageCount, record.exportedAt)
  };
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index++) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return nonce;
}
