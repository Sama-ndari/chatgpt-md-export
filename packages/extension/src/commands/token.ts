import * as vscode from "vscode";
import type { TokenStore } from "../secrets.js";

/** Prompt for the ChatGPT bearer token and store it in the OS keychain. */
export async function setToken(tokens: TokenStore): Promise<string | undefined> {
  const entered = await vscode.window.showInputBox({
    title: vscode.l10n.t("ChatGPT bearer token"),
    prompt: vscode.l10n.t(
      "Paste the Authorization bearer token from a signed-in chatgpt.com request. It is stored in your OS keychain."
    ),
    password: true,
    ignoreFocusOut: true,
    validateInput: (value) => validateToken(value)
  });

  const token = entered?.trim();
  if (!token) return undefined;
  await tokens.write(token);
  void vscode.window.showInformationMessage(vscode.l10n.t("ChatGPT token saved."));
  return token;
}

export async function clearToken(tokens: TokenStore): Promise<void> {
  await tokens.clear();
  void vscode.window.showInformationMessage(vscode.l10n.t("ChatGPT token removed."));
}

/** Returns a stored token, offering to capture one when none is present. */
export async function requireToken(tokens: TokenStore): Promise<string | undefined> {
  const existing = await tokens.read();
  if (existing) return existing;

  const choice = await vscode.window.showWarningMessage(
    vscode.l10n.t("No ChatGPT token is set. Private conversations cannot be exported without one."),
    vscode.l10n.t("Set token"),
    vscode.l10n.t("Continue without")
  );
  if (choice === vscode.l10n.t("Set token")) return setToken(tokens);
  return undefined;
}

function validateToken(value: string): string | undefined {
  const token = value.trim();
  if (!token) return vscode.l10n.t("The token cannot be empty.");
  if (token.split(".").length < 3) {
    return vscode.l10n.t("Expected a JWT with three dot-separated segments.");
  }
  return undefined;
}
