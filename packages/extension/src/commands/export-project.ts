import * as vscode from "vscode";
import {
  exportConversationsFromProject,
  listProjectConversations,
  parseProjectId,
  type ProjectConversationSummary
} from "@chatgpt-md-export/core";
import { buildCoreEnv, readConfig, resolveOutputRoot } from "../config.js";
import type { ExportHistory } from "../exports-history.js";
import type { TokenStore } from "../secrets.js";
import { closeButton, promptInput } from "../ui/prompt-input.js";
import { finishBatchExport } from "./finish-batch-export.js";
import { runExport } from "./run-export.js";
import { requireToken } from "./token.js";

interface ConversationPick extends vscode.QuickPickItem {
  summary: ProjectConversationSummary;
}

/** Prompt for a project link, then export the conversations the user picks. */
export async function exportFromProject(input: {
  tokens: TokenStore;
  history: ExportHistory;
}): Promise<void> {
  const link = await promptForProject(await suggestionFromClipboard());
  if (!link) return;

  const config = readConfig();
  const token = await requireToken(input.tokens);
  if (!token) return;
  const env = buildCoreEnv(token, config);

  const projectId = parseProjectId(link);
  const conversations = await listConversations(projectId, env);
  if (conversations.length === 0) {
    void vscode.window.showInformationMessage(
      vscode.l10n.t("This project has no conversation to export.")
    );
    return;
  }

  const picked = await pickConversations(conversations);
  if (picked.length === 0) return;

  const batch = await runExport(
    vscode.l10n.t("Exporting {0} conversations", String(picked.length)),
    (onProgress) =>
      exportConversationsFromProject({
        projectId,
        conversations: picked,
        outRoot: resolveOutputRoot(config),
        author: config.authorName,
        skipAttachments: !config.downloadAttachments,
        clientOptions: { env },
        onProgress
      })
  );

  await finishBatchExport({ batch, config, history: input.history });
}

async function listConversations(
  projectId: string,
  env: NodeJS.ProcessEnv
): Promise<ProjectConversationSummary[]> {
  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: vscode.l10n.t("Reading the project..."),
      cancellable: false
    },
    () => listProjectConversations({ projectId, env })
  );
}

/**
 * Branches are shown but left unticked: ChatGPT forks a conversation under the
 * same name, so ticking everything would export most threads twice.
 */
async function pickConversations(
  conversations: ProjectConversationSummary[]
): Promise<ProjectConversationSummary[]> {
  const branches = conversations.filter((entry) => entry.branch).length;
  const picked = await vscode.window.showQuickPick<ConversationPick>(conversations.map(toPick), {
    title: vscode.l10n.t(
      "{0} conversations, {1} of them branches",
      String(conversations.length),
      String(branches)
    ),
    placeHolder: vscode.l10n.t("Branches are left unticked, tick them to include them"),
    matchOnDescription: true,
    ignoreFocusOut: true,
    canPickMany: true
  });
  return (picked ?? []).map((item) => item.summary);
}

function toPick(summary: ProjectConversationSummary): ConversationPick {
  const updated = asDay(summary.updateTime ?? summary.createTime);
  return {
    summary,
    label: summary.title,
    description: updated,
    detail: summary.branch ? vscode.l10n.t("Branch of another conversation") : undefined,
    picked: !summary.branch
  };
}

function asDay(value: number | string | null | undefined): string | undefined {
  const ms = typeof value === "number" ? value * 1000 : Date.parse(String(value ?? ""));
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : undefined;
}

function promptForProject(clipboard: string): Promise<string | undefined> {
  return promptInput({
    title: vscode.l10n.t("ChatGPT project link"),
    prompt: vscode.l10n.t("Open the project in ChatGPT and copy the address bar."),
    placeholder: "https://chatgpt.com/g/g-p-.../project",
    value: clipboard,
    buttons: [closeButton()],
    validate: validateProjectLink
  });
}

async function suggestionFromClipboard(): Promise<string> {
  const clipboard = (await vscode.env.clipboard.readText()).trim();
  return validateProjectLink(clipboard) === undefined ? clipboard : "";
}

function validateProjectLink(value: string): string | undefined {
  try {
    parseProjectId(value);
    return undefined;
  } catch {
    return vscode.l10n.t("Paste a project link, for example https://chatgpt.com/g/g-p-.../project");
  }
}
