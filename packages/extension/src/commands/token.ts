import * as vscode from "vscode";
import { TOKEN_SESSION_URL } from "../links.js";
import type { TokenStore } from "../secrets.js";
import { describeToken } from "../token-status.js";
import { closeButton, promptInput } from "../ui/prompt-input.js";

/** Opens the ChatGPT session endpoint, where the token can be copied directly. */
export async function openTokenHelp(): Promise<void> {
  await vscode.env.openExternal(vscode.Uri.parse(TOKEN_SESSION_URL));
}

/** Prompt for the ChatGPT bearer token and store it in the OS keychain. */
export async function setToken(tokens: TokenStore): Promise<string | undefined> {
  const token = await promptForToken();
  if (!token) return undefined;
  await tokens.write(token);
  void vscode.window.showInformationMessage(vscode.l10n.t("ChatGPT token saved."));
  return token;
}

export async function clearToken(tokens: TokenStore): Promise<void> {
  await tokens.clear();
  void vscode.window.showInformationMessage(vscode.l10n.t("ChatGPT token removed."));
}

/**
 * Returns a usable token, offering to capture one when it is missing or stale.
 * Expiry is checked locally first, so the user reads "your token expired"
 * instead of a bare 401 from ChatGPT.
 */
export async function requireToken(tokens: TokenStore): Promise<string | undefined> {
  const existing = await tokens.read();
  const status = describeToken(existing);
  if (existing && status.kind !== "expired") return existing;
  if (status.kind === "expired") return replaceExpiredToken(tokens, status.label);

  const setLabel = vscode.l10n.t("Set token");
  const helpLabel = vscode.l10n.t("Get my token");
  const choice = await vscode.window.showWarningMessage(
    vscode.l10n.t("No ChatGPT token is set. Private conversations cannot be exported without one."),
    setLabel,
    helpLabel
  );
  if (choice === helpLabel) await openTokenHelp();
  if (choice === setLabel) return setToken(tokens);
  return undefined;
}

async function replaceExpiredToken(
  tokens: TokenStore,
  label: string
): Promise<string | undefined> {
  const updateLabel = vscode.l10n.t("Update token");
  const helpLabel = vscode.l10n.t("Get my token");
  const choice = await vscode.window.showWarningMessage(
    vscode.l10n.t("{0} Paste a fresh one to continue.", label),
    updateLabel,
    helpLabel
  );
  if (choice === helpLabel) {
    await openTokenHelp();
    return undefined;
  }
  return choice === updateLabel ? setToken(tokens) : undefined;
}

function promptForToken(): Promise<string | undefined> {
  return promptInput({
    title: vscode.l10n.t("ChatGPT bearer token"),
    prompt: vscode.l10n.t(
      "Open chatgpt.com/api/auth/session while signed in, then copy the accessToken value. Stored in your OS keychain."
    ),
    placeholder: vscode.l10n.t("eyJhbGciOi..."),
    password: true,
    buttons: [
      { icon: "link-external", tooltip: vscode.l10n.t("Open chatgpt.com/api/auth/session"), run: openTokenHelp },
      closeButton()
    ],
    validate: validateToken
  });
}

function validateToken(value: string): string | undefined {
  const token = value.trim();
  if (!token) return vscode.l10n.t("The token cannot be empty.");
  if (token.startsWith("Bearer ")) {
    return vscode.l10n.t('Remove the leading "Bearer " and paste only the token itself.');
  }
  if (token.split(".").length < 3) {
    return vscode.l10n.t("Expected a JWT with three dot-separated segments.");
  }
  return undefined;
}
