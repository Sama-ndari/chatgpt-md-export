import * as vscode from "vscode";
import {
  closeExportArchive,
  exportConversationFromArchive,
  exportConversationsFromArchive,
  formatDate,
  readExportArchive,
  summarizeArchive,
  type ArchiveConversationSummary,
  type ChatgptExportArchive
} from "@chatgpt-md-export/core";
import { readConfig, resolveOutputRoot } from "../config.js";
import type { ExportHistory } from "../exports-history.js";
import { finishBatchExport } from "./finish-batch-export.js";
import { finishExport } from "./finish-export.js";
import { runExport } from "./run-export.js";

interface ConversationPick extends vscode.QuickPickItem {
  conversationId: string;
}

/** Export one or more conversations from the official ChatGPT data export. */
export async function exportFromArchive(input: { history: ExportHistory }): Promise<void> {
  const archivePath = await pickArchiveSource();
  if (!archivePath) return;

  const archive = await readExportArchive(archivePath);
  try {
    const conversationIds = await pickConversations(archive);
    if (conversationIds.length === 0) return;

    const config = readConfig();
    const shared = {
      archive,
      outRoot: resolveOutputRoot(config),
      author: config.authorName,
      skipAttachments: !config.downloadAttachments
    };

    if (conversationIds.length === 1) {
      const result = await runExport(vscode.l10n.t("Exporting from the archive"), (onProgress) =>
        exportConversationFromArchive({ ...shared, conversationId: conversationIds[0], onProgress })
      );
      await finishExport({ result, config, history: input.history });
      return;
    }

    const batch = await runExport(
      vscode.l10n.t("Exporting {0} conversations", String(conversationIds.length)),
      (onProgress) => exportConversationsFromArchive({ ...shared, conversationIds, onProgress })
    );
    await finishBatchExport({ batch, config, history: input.history });
  } finally {
    await closeExportArchive(archive);
  }
}

/**
 * Ask for the downloaded .zip or the unzipped folder. Windows cannot offer
 * both in one dialog, so there the kind is chosen first.
 */
async function pickArchiveSource(): Promise<string | undefined> {
  const zipOnly = process.platform === "win32" ? await askForZip() : undefined;
  if (zipOnly === undefined && process.platform === "win32") return undefined;

  const picked = await vscode.window.showOpenDialog({
    title: vscode.l10n.t("Select the ChatGPT data export (.zip or unzipped folder)"),
    openLabel: vscode.l10n.t("Use this export"),
    canSelectFiles: zipOnly ?? true,
    canSelectFolders: zipOnly === undefined ? true : !zipOnly,
    canSelectMany: false,
    filters: zipOnly === false ? undefined : { [vscode.l10n.t("ChatGPT export")]: ["zip"] }
  });
  return picked?.[0]?.fsPath;
}

async function askForZip(): Promise<boolean | undefined> {
  const zipLabel = vscode.l10n.t("The downloaded .zip file");
  const folderLabel = vscode.l10n.t("An unzipped export folder");
  const choice = await vscode.window.showQuickPick([zipLabel, folderLabel], {
    title: vscode.l10n.t("Where is your ChatGPT data export?")
  });
  return choice === undefined ? undefined : choice === zipLabel;
}

async function pickConversations(archive: ChatgptExportArchive): Promise<string[]> {
  const summaries = summarizeArchive(archive);
  const picked = await vscode.window.showQuickPick<ConversationPick>(summaries.map(toPick), {
    title: vscode.l10n.t("{0} conversations in this archive", String(summaries.length)),
    placeHolder: vscode.l10n.t("Filter by title, pick as many as you want"),
    matchOnDescription: true,
    ignoreFocusOut: true,
    canPickMany: true
  });
  return (picked ?? []).map((item) => item.conversationId);
}

function toPick(summary: ArchiveConversationSummary): ConversationPick {
  const updated = formatDate(summary.updateTime ?? summary.createTime)?.slice(0, 10);
  return {
    conversationId: summary.id,
    label: summary.title,
    description: updated,
    detail: vscode.l10n.t("{0} nodes", String(summary.messageCount))
  };
}
