import fs from "node:fs/promises";
import path from "node:path";
import {
  fetchPrivateConversation,
  fetchProjectConversation,
  fetchSharedConversation,
  type ChatgptClientOptions
} from "../chatgpt/chatgpt-client.js";
import type { ChatgptConversation } from "../chatgpt/types.js";
import { parseChatgptUrl, type ParsedChatgptUrl } from "../chatgpt/url-parser.js";
import { AppError } from "../shared/errors.js";
import {
  collectAttachments,
  conversationToExportMessages
} from "./conversation-messages.js";
import { formatAttachmentSkipped } from "./attachment-failure.js";
import { downloadAttachments } from "./download-attachments.js";
import { renderConversationHtml } from "./render-html.js";
import { renderConversationMarkdown } from "./render-markdown.js";
import { slugifyTitle } from "./slug.js";

export interface ExportConversationInput {
  url: string;
  outDir?: string;
  author?: string;
  skipFiles?: boolean;
  clientOptions?: ChatgptClientOptions;
  env?: NodeJS.ProcessEnv;
}

export interface ExportConversationResult {
  outputDir: string;
  markdownPath: string;
  htmlPath: string;
  filesDir: string;
  title: string;
  author: string;
  sourceUrl: string;
  messageCount: number;
  downloadedFiles: number;
  failedFiles: number;
}

/** Fetch a ChatGPT conversation URL and write conversation.md + files/. */
export async function exportConversation(
  input: ExportConversationInput
): Promise<ExportConversationResult> {
  const env = input.env ?? process.env;
  const parsed = parseChatgptUrl(input.url);
  const conversation = await fetchRemoteConversation(parsed, input.clientOptions);
  const messages = conversationToExportMessages(conversation);
  const attachments = collectAttachments(messages);
  const title = conversation.title?.trim() || "Untitled";
  const author = resolveAuthor(input.author, env);
  const rootOut = path.resolve(input.outDir ?? path.join(process.cwd(), "exports"));
  const outputDir = path.join(rootOut, `${slugifyTitle(title)}-${shortId(parsed.cacheId)}`);
  const filesDir = path.join(outputDir, "files");
  const markdownPath = path.join(outputDir, "conversation.md");
  const htmlPath = path.join(outputDir, "conversation.html");

  await fs.mkdir(outputDir, { recursive: true });

  let relativePaths = new Map<string, string>();
  let failedKeys = new Set<string>();
  let failedReasons = new Map<string, string>();
  let downloadedFiles = 0;

  if (!input.skipFiles && attachments.length > 0) {
    const conversationId =
      conversation.original_conversation_id && typeof conversation.original_conversation_id === "string"
        ? conversation.original_conversation_id
        : parsed.kind === "share"
          ? undefined
          : parsed.id;

    const downloadResult = await downloadAttachments({
      attachments,
      filesDir,
      conversationId,
      clientOptions: input.clientOptions
    });
    relativePaths = downloadResult.relativePaths;
    failedKeys = downloadResult.failedKeys;
    failedReasons = downloadResult.failedReasons;
    downloadedFiles = downloadResult.downloaded.length;
  } else if (attachments.length > 0 && input.skipFiles) {
    for (const attachment of attachments) {
      failedKeys.add(attachment.key);
      failedReasons.set(attachment.key, formatAttachmentSkipped(attachment));
    }
  }

  const header = {
    title,
    author,
    sourceUrl: parsed.sourceUrl,
    createTime: conversation.create_time,
    updateTime: conversation.update_time,
    model: conversation.model,
    exportedAt: new Date().toISOString()
  };
  const markdown = renderConversationMarkdown({
    header,
    messages,
    relativePaths,
    failedKeys,
    failedReasons
  });
  const html = renderConversationHtml({
    header,
    messages,
    relativePaths,
    failedKeys,
    failedReasons
  });

  try {
    await fs.writeFile(markdownPath, markdown, "utf8");
    await fs.writeFile(htmlPath, html, "utf8");
    await fs.writeFile(
      path.join(outputDir, "conversation.json"),
      JSON.stringify(conversation, null, 2),
      "utf8"
    );
  } catch (error) {
    throw new AppError(
      "EXPORT_WRITE_FAILED",
      `Failed to write export files: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return {
    outputDir,
    markdownPath,
    htmlPath,
    filesDir,
    title,
    author,
    sourceUrl: parsed.sourceUrl,
    messageCount: messages.length,
    downloadedFiles,
    failedFiles: failedKeys.size
  };
}

async function fetchRemoteConversation(
  parsed: ParsedChatgptUrl,
  clientOptions?: ChatgptClientOptions
): Promise<ChatgptConversation> {
  if (parsed.kind === "share") {
    return fetchSharedConversation(parsed.id, clientOptions);
  }
  if (parsed.kind === "project") {
    if (!parsed.projectId) {
      throw new AppError("UNSUPPORTED_URL", "ChatGPT project URL is missing a recognizable project id.");
    }
    return fetchProjectConversation(
      {
        conversationId: parsed.id,
        projectId: parsed.projectId,
        ownerUserId: parsed.ownerUserId,
        sourceUrl: parsed.sourceUrl
      },
      clientOptions
    );
  }
  return fetchPrivateConversation(parsed.id, clientOptions);
}

function resolveAuthor(explicit: string | undefined, env: NodeJS.ProcessEnv): string {
  return explicit?.trim() || env.CHATGPT_AUTHOR_NAME?.trim() || "User";
}

function shortId(value: string): string {
  return value.replace(/^share-/, "").slice(0, 8);
}
