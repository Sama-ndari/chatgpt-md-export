import * as vscode from "vscode";
import type { ConversationExportResult } from "@chatgpt-md-export/core";
import type { ExtensionConfig } from "../config.js";
import type { ExportHistory } from "../exports-history.js";
import { logger } from "../logger.js";
import { showPreview } from "../preview-panel.js";

/** Record the export, surface it, and report attachment problems. */
export async function finishExport(input: {
  result: ConversationExportResult;
  config: ExtensionConfig;
  history: ExportHistory;
}): Promise<void> {
  const { result, config } = input;
  logger().info(`Exported "${result.title}" to ${result.outputDir}`);
  await input.history.add({
    outputDir: result.outputDir,
    htmlPath: result.htmlPath,
    markdownPath: result.markdownPath,
    title: result.title,
    messageCount: result.messageCount,
    exportedAt: new Date().toISOString()
  });

  await openResult(result, config.openAfterExport);
  void notify(result);
}

async function openResult(
  result: ConversationExportResult,
  openAfterExport: ExtensionConfig["openAfterExport"]
): Promise<void> {
  if (openAfterExport === "preview") {
    await showPreview(result.htmlPath, result.title);
    return;
  }
  if (openAfterExport === "markdown") {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(result.markdownPath));
    await vscode.window.showTextDocument(document, { preview: false });
  }
}

async function notify(result: ConversationExportResult): Promise<void> {
  const message = result.failedFiles
    ? vscode.l10n.t(
        "Exported \"{0}\". {1} attachment(s) were unavailable.",
        result.title,
        String(result.failedFiles)
      )
    : vscode.l10n.t("Exported \"{0}\".", result.title);
  const revealLabel = vscode.l10n.t("Reveal folder");

  const choice = await vscode.window.showInformationMessage(message, revealLabel);
  if (choice === revealLabel) {
    await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(result.markdownPath));
  }
}
