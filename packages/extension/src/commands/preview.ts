import * as vscode from "vscode";
import type { LastExportStore } from "../last-export.js";
import { showPreview } from "../preview-panel.js";

/** Reopen the most recent export in the webview panel. */
export async function previewLastExport(lastExport: LastExportStore): Promise<void> {
  const last = lastExport.read();
  if (!last) {
    void vscode.window.showInformationMessage(
      vscode.l10n.t("Nothing exported yet in this workspace.")
    );
    return;
  }
  await showPreview(last.htmlPath, last.title);
}
