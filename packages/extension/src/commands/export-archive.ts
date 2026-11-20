import * as vscode from "vscode";
import {
  exportConversationFromArchive,
  formatDate,
  readExportArchive,
  summarizeArchive,
  type ArchiveConversationSummary,
  type ChatgptExportArchive
} from "@chatgpt-md-export/core";
import { readConfig, resolveOutputRoot } from "../config.js";
import type { LastExportStore } from "../last-export.js";
import { finishExport } from "./finish-export.js";

interface ConversationPick extends vscode.QuickPickItem {
  conversationId: string;
}

/** Export one conversation out of an unzipped official ChatGPT data export. */
export async function exportFromArchive(input: { lastExport: LastExportStore }): Promise<void> {
  const archivePath = await pickArchiveFolder();
  if (!archivePath) return;

  const archive = await readExportArchive(archivePath);
  const conversationId = await pickConversation(archive);
  if (!conversationId) return;

  const config = readConfig();
  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: vscode.l10n.t("Exporting conversation from the archive…"),
      cancellable: false
    },
    () =>
      exportConversationFromArchive({
        archive,
        conversationId,
        outRoot: resolveOutputRoot(config),
        author: config.authorName,
        skipAttachments: !config.downloadAttachments
      })
  );

  await finishExport({ result, config, lastExport: input.lastExport });
}

async function pickArchiveFolder(): Promise<string | undefined> {
  const picked = await vscode.window.showOpenDialog({
    title: vscode.l10n.t("Select the unzipped ChatGPT export folder"),
    openLabel: vscode.l10n.t("Use this folder"),
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false
  });
  return picked?.[0]?.fsPath;
}

async function pickConversation(archive: ChatgptExportArchive): Promise<string | undefined> {
  const summaries = summarizeArchive(archive);
  const picked = await vscode.window.showQuickPick<ConversationPick>(summaries.map(toPick), {
    title: vscode.l10n.t("{0} conversations in this archive", String(summaries.length)),
    placeHolder: vscode.l10n.t("Filter by title…"),
    matchOnDescription: true,
    ignoreFocusOut: true
  });
  return picked?.conversationId;
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
