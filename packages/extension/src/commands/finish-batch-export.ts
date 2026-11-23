import * as vscode from "vscode";
import type { BatchExportResult } from "@chatgpt-md-export/core";
import { describeOutputRoot, type ExtensionConfig } from "../config.js";
import type { ExportHistory } from "../exports-history.js";
import { logger } from "../logger.js";

/** Record every conversation a batch wrote, then report the run in one notice. */
export async function finishBatchExport(input: {
  batch: BatchExportResult;
  config: ExtensionConfig;
  history: ExportHistory;
}): Promise<void> {
  const { batch, config } = input;
  const exportedAt = new Date().toISOString();

  for (const result of batch.exports) {
    await input.history.add({
      outputDir: result.outputDir,
      htmlPath: result.htmlPath,
      markdownPath: result.markdownPath,
      title: result.title,
      messageCount: result.messageCount,
      exportedAt
    });
  }

  for (const failure of batch.failures) {
    logger().warn(`Skipped "${failure.title}" (${failure.conversationId}): ${failure.reason}`);
  }
  logger().info(
    `Batch export wrote ${batch.exports.length} conversation(s), ${batch.failures.length} failed`
  );

  await notify(batch, describeOutputRoot(config));
}

async function notify(batch: BatchExportResult, destination: string): Promise<void> {
  const first = batch.exports[0];
  if (!first) {
    void vscode.window.showErrorMessage(
      vscode.l10n.t("No conversation could be exported. See the output log for details.")
    );
    return;
  }

  const message = batch.failures.length
    ? vscode.l10n.t(
        "Exported {0} conversations to {1}. {2} could not be read.",
        String(batch.exports.length),
        destination,
        String(batch.failures.length)
      )
    : vscode.l10n.t(
        "Exported {0} conversations to {1}.",
        String(batch.exports.length),
        destination
      );

  const revealLabel = vscode.l10n.t("Reveal folder");
  const choice = await vscode.window.showInformationMessage(message, revealLabel);
  if (choice === revealLabel) {
    await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(first.markdownPath));
  }
}
