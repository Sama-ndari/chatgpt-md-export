import * as vscode from "vscode";
import type { ExportHistory, ExportRecord } from "../exports-history.js";
import { showPreview } from "../preview-panel.js";

/** Default click on a recent export: show the rendered conversation. */
export async function openExport(
  record: ExportRecord | undefined,
  history: ExportHistory
): Promise<void> {
  const target = record ?? history.latest();
  if (!target) {
    void vscode.window.showInformationMessage(vscode.l10n.t("Nothing exported yet."));
    return;
  }
  await showPreview(target.htmlPath, target.title);
}

export async function openExportMarkdown(record: ExportRecord | undefined): Promise<void> {
  if (!record) return;
  const document = await vscode.workspace.openTextDocument(
    vscode.Uri.file(record.markdownPath)
  );
  await vscode.window.showTextDocument(document, { preview: false });
}

export async function revealExportFolder(record: ExportRecord | undefined): Promise<void> {
  if (!record) return;
  await vscode.commands.executeCommand(
    "revealFileInOS",
    vscode.Uri.file(record.markdownPath)
  );
}

/** Drops the entry from the sidebar. The exported files stay on disk. */
export async function forgetExport(
  record: ExportRecord | undefined,
  history: ExportHistory
): Promise<void> {
  if (!record) return;
  await history.remove(record.outputDir);
}
