import * as vscode from "vscode";

let channel: vscode.LogOutputChannel | undefined;

/** Single output channel for the extension, created lazily. */
export function logger(): vscode.LogOutputChannel {
  channel ??= vscode.window.createOutputChannel("ChatGPT Markdown Export", { log: true });
  return channel;
}

export function disposeLogger(): void {
  channel?.dispose();
  channel = undefined;
}
