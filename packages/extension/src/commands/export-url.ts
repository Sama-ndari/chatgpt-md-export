import * as vscode from "vscode";
import { exportConversationFromUrl, parseChatgptUrl } from "@chatgpt-md-export/core";
import { buildCoreEnv, readConfig, resolveOutputRoot } from "../config.js";
import type { LastExportStore } from "../last-export.js";
import type { TokenStore } from "../secrets.js";
import { finishExport } from "./finish-export.js";
import { requireToken } from "./token.js";

/** Prompt for a ChatGPT URL, fetch it through the core, and write the export. */
export async function exportFromUrl(input: {
  tokens: TokenStore;
  lastExport: LastExportStore;
}): Promise<void> {
  const url = await promptForUrl();
  if (!url) return;

  const config = readConfig();
  const token = await requireToken(input.tokens);
  const env = buildCoreEnv(token, config);

  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: vscode.l10n.t("Exporting ChatGPT conversation…"),
      cancellable: false
    },
    () =>
      exportConversationFromUrl({
        url,
        outRoot: resolveOutputRoot(config),
        author: config.authorName,
        skipAttachments: !config.downloadAttachments,
        env,
        clientOptions: { env }
      })
  );

  await finishExport({ result, config, lastExport: input.lastExport });
}

async function promptForUrl(): Promise<string | undefined> {
  const clipboard = await suggestionFromClipboard();
  const entered = await vscode.window.showInputBox({
    title: vscode.l10n.t("ChatGPT conversation URL"),
    prompt: vscode.l10n.t("Supports /c/, /share/ and project conversation links."),
    value: clipboard,
    ignoreFocusOut: true,
    validateInput: (value) => validateUrl(value)
  });
  return entered?.trim() || undefined;
}

/** Pre-fill the box when the clipboard already holds a ChatGPT link. */
async function suggestionFromClipboard(): Promise<string> {
  const clipboard = (await vscode.env.clipboard.readText()).trim();
  return validateUrl(clipboard) === undefined ? clipboard : "";
}

function validateUrl(value: string): string | undefined {
  const url = value.trim();
  if (!url) return vscode.l10n.t("Paste a ChatGPT conversation or share URL.");
  try {
    parseChatgptUrl(url);
    return undefined;
  } catch {
    return vscode.l10n.t("Not a supported ChatGPT conversation, share, or project URL.");
  }
}
