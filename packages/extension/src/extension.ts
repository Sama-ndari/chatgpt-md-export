import * as vscode from "vscode";
import { serializeError } from "@chatgpt-md-export/core";
import { exportFromArchive } from "./commands/export-archive.js";
import {
  forgetExport,
  openExport,
  openExportMarkdown,
  revealExportFolder
} from "./commands/export-actions.js";
import { exportFromProject } from "./commands/export-project.js";
import { exportFromUrl } from "./commands/export-url.js";
import { clearToken, openTokenHelp, setToken } from "./commands/token.js";
import { ExportHistory, type ExportRecord } from "./exports-history.js";
import { disposeLogger, logger } from "./logger.js";
import { openReviewPage, RatingPrompt } from "./rating-prompt.js";
import { TokenStore } from "./secrets.js";
import { SidebarViewProvider, SIDEBAR_VIEW_ID } from "./views/sidebar-view.js";

type CommandHandler = (record?: ExportRecord) => Promise<void>;

export function activate(context: vscode.ExtensionContext): void {
  const tokens = new TokenStore(context.secrets);
  const history = new ExportHistory(context.workspaceState);
  const rating = new RatingPrompt(context.globalState);
  const sidebar = new SidebarViewProvider(context.extensionUri, history, tokens, rating);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SIDEBAR_VIEW_ID, sidebar),
    { dispose: disposeLogger }
  );
  registerCommands(context, buildCommands({ tokens, history }), () => void sidebar.refresh());
  logger().info("ChatGPT Markdown Export activated.");
}

export function deactivate(): void {
  disposeLogger();
}

function buildCommands(deps: {
  tokens: TokenStore;
  history: ExportHistory;
}): Record<string, CommandHandler> {
  const { tokens, history } = deps;
  return {
    "chatgptMdExport.exportFromUrl": () => exportFromUrl({ tokens, history }),
    "chatgptMdExport.exportFromArchive": () => exportFromArchive({ history }),
    "chatgptMdExport.exportFromProject": () => exportFromProject({ tokens, history }),
    "chatgptMdExport.setToken": async () => void (await setToken(tokens)),
    "chatgptMdExport.clearToken": () => clearToken(tokens),
    "chatgptMdExport.openTokenHelp": () => openTokenHelp(),
    "chatgptMdExport.preview": (record) => openExport(record, history),
    "chatgptMdExport.openExport": (record) => openExport(record, history),
    "chatgptMdExport.openMarkdown": (record) => openExportMarkdown(record),
    "chatgptMdExport.revealFolder": (record) => revealExportFolder(record),
    "chatgptMdExport.forgetExport": (record) => forgetExport(record, history),
    "chatgptMdExport.rate": () => openReviewPage(),
    "chatgptMdExport.refresh": () => Promise.resolve()
  };
}

function registerCommands(
  context: vscode.ExtensionContext,
  handlers: Record<string, CommandHandler>,
  refresh: () => void
): void {
  for (const [id, handler] of Object.entries(handlers)) {
    context.subscriptions.push(
      vscode.commands.registerCommand(id, (record?: ExportRecord) =>
        runCommand(id, () => handler(record), refresh)
      )
    );
  }
}

/** Turn core AppErrors into one actionable notification plus a log entry. */
async function runCommand(
  id: string,
  handler: () => Promise<void>,
  refresh: () => void
): Promise<void> {
  try {
    await handler();
  } catch (error) {
    const serialized = serializeError(error);
    logger().error(`${id} failed. ${serialized.error_code}: ${serialized.message}`);
    const showLog = vscode.l10n.t("Show log");
    const choice = await vscode.window.showErrorMessage(
      vscode.l10n.t("{0}: {1}", serialized.error_code, serialized.message),
      showLog
    );
    if (choice === showLog) logger().show(true);
  } finally {
    refresh();
  }
}
