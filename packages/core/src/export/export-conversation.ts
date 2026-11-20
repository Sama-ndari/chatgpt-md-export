import fs from "node:fs/promises";
import path from "node:path";
import type { ChatgptConversation } from "../chatgpt/types.js";
import { AppError } from "../shared/errors.js";
import { formatAttachmentSkipped } from "./attachment-failure.js";
import type { AttachmentSource } from "./attachment-source.js";
import { collectAttachments, conversationToExportMessages } from "./conversation-messages.js";
import { downloadAttachments } from "./download-attachments.js";
import type { ProgressReporter } from "./progress.js";
import { renderConversationHtml } from "./render-html.js";
import { renderConversationMarkdown, type MarkdownHeaderInput } from "./render-markdown.js";
import { slugifyTitle } from "./slug.js";

export interface WriteConversationExportInput {
  conversation: ChatgptConversation;
  /** Absolute directory that receives the per-conversation export folder. */
  outRoot: string;
  /** Shown as `Source` in the export header: a URL, or an archive path. */
  sourceUrl: string;
  /** Short id appended to the folder name to keep exports distinguishable. */
  folderId: string;
  author: string;
  /** Omit to render attachment placeholders instead of downloading files. */
  attachments?: AttachmentSource;
  onProgress?: ProgressReporter;
}

export interface ConversationExportResult {
  outputDir: string;
  markdownPath: string;
  htmlPath: string;
  jsonPath: string;
  filesDir: string;
  title: string;
  author: string;
  sourceUrl: string;
  messageCount: number;
  downloadedFiles: number;
  failedFiles: number;
}

interface ResolvedAttachments {
  relativePaths: Map<string, string>;
  failedKeys: Set<string>;
  failedReasons: Map<string, string>;
  downloadedFiles: number;
}

/** Render a conversation to conversation.md + .html + .json, plus files/. */
export async function writeConversationExport(
  input: WriteConversationExportInput
): Promise<ConversationExportResult> {
  const messages = conversationToExportMessages(input.conversation);
  const title = input.conversation.title?.trim() || "Untitled";
  const outputDir = path.join(
    input.outRoot,
    `${slugifyTitle(title)}-${shortFolderId(input.folderId)}`
  );
  const filesDir = path.join(outputDir, "files");

  await fs.mkdir(outputDir, { recursive: true });
  const resolved = await resolveAttachments({
    attachments: collectAttachments(messages),
    filesDir,
    source: input.attachments,
    onProgress: input.onProgress
  });

  input.onProgress?.({ stage: "writing" });

  const header: MarkdownHeaderInput = {
    title,
    author: input.author,
    sourceUrl: input.sourceUrl,
    createTime: input.conversation.create_time,
    updateTime: input.conversation.update_time,
    model: input.conversation.model,
    exportedAt: new Date().toISOString()
  };
  const renderInput = { header, messages, ...resolved };
  const paths = await writeExportFiles({
    outputDir,
    markdown: renderConversationMarkdown(renderInput),
    html: renderConversationHtml(renderInput),
    conversation: input.conversation
  });

  return {
    ...paths,
    filesDir,
    title,
    author: input.author,
    sourceUrl: input.sourceUrl,
    messageCount: messages.length,
    downloadedFiles: resolved.downloadedFiles,
    failedFiles: resolved.failedKeys.size
  };
}

async function resolveAttachments(input: {
  attachments: ReturnType<typeof collectAttachments>;
  filesDir: string;
  source?: AttachmentSource;
  onProgress?: ProgressReporter;
}): Promise<ResolvedAttachments> {
  const empty: ResolvedAttachments = {
    relativePaths: new Map(),
    failedKeys: new Set(),
    failedReasons: new Map(),
    downloadedFiles: 0
  };
  if (input.attachments.length === 0) return empty;

  if (!input.source) {
    for (const attachment of input.attachments) {
      empty.failedKeys.add(attachment.key);
      empty.failedReasons.set(attachment.key, formatAttachmentSkipped(attachment));
    }
    return empty;
  }

  const result = await downloadAttachments({
    attachments: input.attachments,
    filesDir: input.filesDir,
    source: input.source,
    onProgress: input.onProgress
  });
  return {
    relativePaths: result.relativePaths,
    failedKeys: result.failedKeys,
    failedReasons: result.failedReasons,
    downloadedFiles: result.downloaded.length
  };
}

async function writeExportFiles(input: {
  outputDir: string;
  markdown: string;
  html: string;
  conversation: ChatgptConversation;
}): Promise<{ outputDir: string; markdownPath: string; htmlPath: string; jsonPath: string }> {
  const markdownPath = path.join(input.outputDir, "conversation.md");
  const htmlPath = path.join(input.outputDir, "conversation.html");
  const jsonPath = path.join(input.outputDir, "conversation.json");

  try {
    await fs.writeFile(markdownPath, input.markdown, "utf8");
    await fs.writeFile(htmlPath, input.html, "utf8");
    await fs.writeFile(jsonPath, JSON.stringify(input.conversation, null, 2), "utf8");
  } catch (error) {
    throw new AppError(
      "EXPORT_WRITE_FAILED",
      `Failed to write export files in ${input.outputDir}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return { outputDir: input.outputDir, markdownPath, htmlPath, jsonPath };
}

function shortFolderId(value: string): string {
  return value.replace(/^share-/, "").slice(0, 8) || "export";
}
