import * as vscode from "vscode";
import { exportConversationFromUrl, parseChatgptUrl } from "@chatgpt-md-export/core";
import { buildCoreEnv, readConfig, resolveOutputRoot } from "../config.js";
import type { ExportHistory } from "../exports-history.js";
import { URL_HELP_URL } from "../links.js";
import type { TokenStore } from "../secrets.js";
import { closeButton, helpButton, promptInput } from "../ui/prompt-input.js";
import { finishExport } from "./finish-export.js";
import { runExport } from "./run-export.js";
import { requireToken } from "./token.js";

/** Prompt for a ChatGPT URL, fetch it through the core, and write the export. */
export async function exportFromUrl(input: {
  tokens: TokenStore;
  history: ExportHistory;
}): Promise<void> {
  const url = await promptForUrl(await suggestionFromClipboard());
  if (!url) return;

  const config = readConfig();
  const token = await requireToken(input.tokens);
  const env = buildCoreEnv(token, config);

  const result = await runExport(vscode.l10n.t("Exporting from ChatGPT"), (onProgress) =>
    exportConversationFromUrl({
      url,
      outRoot: resolveOutputRoot(config),
      author: config.authorName,
      skipAttachments: !config.downloadAttachments,
      env,
      clientOptions: { env },
      onProgress
    })
  );

  await finishExport({ result, config, history: input.history });
}

function promptForUrl(clipboard: string): Promise<string | undefined> {
  return promptInput({
    title: vscode.l10n.t("ChatGPT conversation URL"),
    prompt: vscode.l10n.t("Supports /c/, /share/ and project conversation links."),
    placeholder: "https://chatgpt.com/c/...",
    value: clipboard,
    buttons: [helpButton(openUrlHelp), closeButton()],
    validate: validateUrl
  });
}

async function openUrlHelp(): Promise<void> {
  await vscode.env.openExternal(vscode.Uri.parse(URL_HELP_URL));
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
