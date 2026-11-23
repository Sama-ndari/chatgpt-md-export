import * as vscode from "vscode";
import { BUILDER_NAME, BUILDER_URL } from "@chatgpt-md-export/core";

/** Webviews cannot call vscode.l10n, so every label is translated here. */
export function sidebarStrings(): Record<string, string> {
  return {
    intro: vscode.l10n.t(
      "Save a ChatGPT conversation as clean Markdown, an HTML chat view and its attachments."
    ),
    newExport: vscode.l10n.t("New export"),
    archiveTitle: vscode.l10n.t("From your data export"),
    archiveNote: vscode.l10n.t("Point at the .zip ChatGPT emailed you, or its unzipped folder."),
    recommended: vscode.l10n.t("No token needed"),
    projectTitle: vscode.l10n.t("From a project"),
    projectNote: vscode.l10n.t("Paste a project link, export every chat in it."),
    urlTitle: vscode.l10n.t("From a conversation link"),
    urlNote: vscode.l10n.t("Paste a /c/, /share/ or project link."),
    recent: vscode.l10n.t("Recent exports"),
    savedIn: vscode.l10n.t("Saved in {0} in the current workspace"),
    noExports: vscode.l10n.t("Nothing exported yet. Start with your data export above."),
    openMarkdown: vscode.l10n.t("Open the Markdown file"),
    revealFolder: vscode.l10n.t("Reveal the export folder"),
    forget: vscode.l10n.t("Remove from this list"),
    account: vscode.l10n.t("Account"),
    tokenSet: vscode.l10n.t("Token saved in your keychain"),
    tokenMissing: vscode.l10n.t("No token. Link mode is unavailable."),
    addToken: vscode.l10n.t("Add token"),
    removeToken: vscode.l10n.t("Remove token"),
    getToken: vscode.l10n.t("Get my token"),
    rateTitle: vscode.l10n.t("Enjoying this?"),
    rateNote: vscode.l10n.t("A rating on the Marketplace takes ten seconds and helps a lot."),
    rateAction: vscode.l10n.t("Rate it"),
    rateDismiss: vscode.l10n.t("Not now"),
    reviewLink: vscode.l10n.t("Rate this extension"),
    working: vscode.l10n.t("Working..."),
    builtBy: vscode.l10n.t("Built by"),
    builderName: BUILDER_NAME,
    builderUrl: BUILDER_URL,
    footer: vscode.l10n.t("Unofficial. Not affiliated with OpenAI.")
  };
}

/** "2 messages, today": a relative day keeps the row short. */
export function describeExport(messageCount: number, exportedAt: string): string {
  const messages = vscode.l10n.t("{0} messages", String(messageCount));
  const when = relativeDay(exportedAt);
  return when ? `${messages}, ${when}` : messages;
}

function relativeDay(isoDate: string): string | undefined {
  const exported = new Date(isoDate);
  if (Number.isNaN(exported.getTime())) return undefined;

  const days = Math.floor((Date.now() - exported.getTime()) / 86_400_000);
  if (days <= 0) return vscode.l10n.t("today");
  if (days === 1) return vscode.l10n.t("yesterday");
  if (days < 30) return vscode.l10n.t("{0} days ago", String(days));
  return exported.toISOString().slice(0, 10);
}
