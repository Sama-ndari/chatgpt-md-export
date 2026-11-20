import os from "node:os";
import path from "node:path";
import * as vscode from "vscode";

export type OpenAfterExport = "markdown" | "preview" | "none";

export interface ExtensionConfig {
  outputDirectory: string;
  authorName?: string;
  downloadAttachments: boolean;
  accountId?: string;
  openAfterExport: OpenAfterExport;
}

const SECTION = "chatgptMdExport";

/** Kept distinct from a project's own "exports" folder, which means something in JS. */
const DEFAULT_OUTPUT_DIRECTORY = "chatgpt-exports";

export function readConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration(SECTION);
  return {
    outputDirectory: config.get<string>("outputDirectory")?.trim() || DEFAULT_OUTPUT_DIRECTORY,
    authorName: config.get<string>("authorName")?.trim() || undefined,
    downloadAttachments: config.get<boolean>("downloadAttachments") ?? true,
    accountId: config.get<string>("accountId")?.trim() || undefined,
    openAfterExport: config.get<OpenAfterExport>("openAfterExport") ?? "preview"
  };
}

/**
 * Absolute output root. A relative setting resolves against the first
 * workspace folder, falling back to the OS temp dir when none is open.
 */
export function resolveOutputRoot(config: ExtensionConfig): string {
  if (path.isAbsolute(config.outputDirectory)) return config.outputDirectory;
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot) return path.join(workspaceRoot, config.outputDirectory);
  return path.join(os.tmpdir(), "chatgpt-md-export");
}

/**
 * Where exports land, phrased for the panel: relative to the workspace when it
 * sits inside it, absolute otherwise.
 */
export function describeOutputRoot(config: ExtensionConfig): string {
  const root = resolveOutputRoot(config);
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot && root.startsWith(workspaceRoot + path.sep)) {
    return `${path.relative(workspaceRoot, root)}${path.sep}`;
  }
  return root;
}

/** Environment passed to the core, built from secrets and settings only. */
export function buildCoreEnv(token: string | undefined, config: ExtensionConfig): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  if (token) env.CHATGPT_BEARER_TOKEN = token;
  if (config.accountId) env.CHATGPT_ACCOUNT_ID = config.accountId;
  if (config.authorName) env.CHATGPT_AUTHOR_NAME = config.authorName;
  return env;
}
