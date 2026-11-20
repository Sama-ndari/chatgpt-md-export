import * as vscode from "vscode";
import { serializeError } from "@chatgpt-md-export/core";
import { exportFromArchive } from "./commands/export-archive.js";
import { exportFromUrl } from "./commands/export-url.js";
import { previewLastExport } from "./commands/preview.js";
import { clearToken, setToken } from "./commands/token.js";
import { LastExportStore } from "./last-export.js";
import { disposeLogger, logger } from "./logger.js";
import { TokenStore } from "./secrets.js";

export function activate(context: vscode.ExtensionContext): void {
  const tokens = new TokenStore(context.secrets);
  const lastExport = new LastExportStore(context.workspaceState);

  const commands: Record<string, () => Promise<void>> = {
    "chatgptMdExport.exportFromUrl": () => exportFromUrl({ tokens, lastExport }),
    "chatgptMdExport.exportFromArchive": () => exportFromArchive({ lastExport }),
    "chatgptMdExport.setToken": async () => void (await setToken(tokens)),
    "chatgptMdExport.clearToken": () => clearToken(tokens),
    "chatgptMdExport.preview": () => previewLastExport(lastExport)
  };

  for (const [id, handler] of Object.entries(commands)) {
    context.subscriptions.push(
      vscode.commands.registerCommand(id, () => runCommand(id, handler))
    );
  }
  context.subscriptions.push({ dispose: disposeLogger });
  logger().info("ChatGPT Markdown Export activated.");
}

export function deactivate(): void {
  disposeLogger();
}

/** Turn core AppErrors into one actionable notification plus a log entry. */
async function runCommand(id: string, handler: () => Promise<void>): Promise<void> {
  try {
    await handler();
  } catch (error) {
    const serialized = serializeError(error);
    logger().error(`${id} failed — ${serialized.error_code}: ${serialized.message}`);
    const showLog = vscode.l10n.t("Show log");
    const choice = await vscode.window.showErrorMessage(
      vscode.l10n.t("{0}: {1}", serialized.error_code, serialized.message),
      showLog
    );
    if (choice === showLog) logger().show(true);
  }
}
