import * as vscode from "vscode";
import type { ConversationExportResult, ExportProgress, ProgressReporter } from "@chatgpt-md-export/core";
import { setBusy } from "../ui/busy.js";

type ProgressHandle = vscode.Progress<{ message?: string; increment?: number }>;

/**
 * Runs an export behind a notification and the panel's busy strip, forwarding
 * core progress to both so a long attachment download never looks frozen.
 */
export async function runExport(
  title: string,
  task: (report: ProgressReporter) => Promise<ConversationExportResult>
): Promise<ConversationExportResult> {
  setBusy({ active: true, message: title });
  try {
    return await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title, cancellable: false },
      (progress) => task((update) => publish(progress, title, update))
    );
  } finally {
    setBusy({ active: false });
  }
}

function publish(progress: ProgressHandle, title: string, update: ExportProgress): void {
  const message = describe(update);
  progress.report({ message });
  setBusy({ active: true, message: `${title} ${message}` });
}

function describe(update: ExportProgress): string {
  if (update.stage === "reading") return vscode.l10n.t("Reading the conversation...");
  if (update.stage === "writing") return vscode.l10n.t("Writing files...");
  return vscode.l10n.t(
    "Attachment {0} of {1}...",
    String(update.completed + 1),
    String(update.total)
  );
}
