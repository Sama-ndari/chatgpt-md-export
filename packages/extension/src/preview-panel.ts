import fs from "node:fs/promises";
import path from "node:path";
import * as vscode from "vscode";
import { AppError } from "@chatgpt-md-export/core";

const VIEW_TYPE = "chatgptMdExport.preview";

let panel: vscode.WebviewPanel | undefined;

/** Show an exported conversation.html inside a reusable webview panel. */
export async function showPreview(htmlPath: string, title: string): Promise<void> {
  const exportDir = vscode.Uri.file(path.dirname(htmlPath));
  panel ??= createPanel(exportDir);
  panel.title = title;
  panel.webview.html = toWebviewHtml(panel.webview, await readExportHtml(htmlPath), exportDir);
  panel.reveal(vscode.ViewColumn.Beside, true);
}

function createPanel(exportDir: vscode.Uri): vscode.WebviewPanel {
  const created = vscode.window.createWebviewPanel(
    VIEW_TYPE,
    "ChatGPT export",
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [exportDir] }
  );
  created.onDidDispose(() => {
    panel = undefined;
  });
  return created;
}

async function readExportHtml(htmlPath: string): Promise<string> {
  try {
    return await fs.readFile(htmlPath, "utf8");
  } catch (error) {
    throw new AppError(
      "EXPORT_WRITE_FAILED",
      `Could not read ${htmlPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Rewrite `files/...` references to webview URIs and inject a CSP, since a
 * webview cannot load workspace files or remote fonts without both.
 */
function toWebviewHtml(webview: vscode.Webview, html: string, exportDir: vscode.Uri): string {
  const filesBase = webview.asWebviewUri(vscode.Uri.joinPath(exportDir, "files")).toString();
  const rewritten = html.replace(
    /(src|href)="files\/([^"]+)"/g,
    (_match, attribute: string, relative: string) => `${attribute}="${filesBase}/${relative}"`
  );
  return rewritten.replace("<head>", `<head>\n  ${contentSecurityPolicy(webview)}`);
}

function contentSecurityPolicy(webview: vscode.Webview): string {
  const directives = [
    "default-src 'none'",
    `img-src ${webview.cspSource} data:`,
    `media-src ${webview.cspSource}`,
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "script-src 'unsafe-inline'"
  ];
  return `<meta http-equiv="Content-Security-Policy" content="${directives.join("; ")}" />`;
}
