import type { ExportMessage } from "../chatgpt/types.js";
import { formatDate } from "../shared/format-date.js";

export interface MarkdownHeaderInput {
  title: string;
  author: string;
  sourceUrl: string;
  createTime?: number | string | null;
  updateTime?: number | string | null;
  model?: string;
  exportedAt?: string;
}

export interface RenderMarkdownInput {
  header: MarkdownHeaderInput;
  messages: ExportMessage[];
  /** Map attachment.key → relative path from the markdown file (e.g. files/photo.png). */
  relativePaths: Map<string, string>;
  /** Keys that failed to download (shown as placeholders). */
  failedKeys?: Set<string>;
  /** Optional richer failure notes keyed by attachment.key. */
  failedReasons?: Map<string, string>;
  authorLabel?: string;
  assistantLabel?: string;
}

/** Render a conversation markdown document with title/author header and relative file links. */
export function renderConversationMarkdown(input: RenderMarkdownInput): string {
  const authorLabel = input.authorLabel ?? "Author";
  const assistantLabel = input.assistantLabel ?? "Assistant";
  const lines: string[] = [];

  lines.push(`# ${input.header.title}`);
  lines.push("");
  lines.push(`- **Title:** ${input.header.title}`);
  lines.push(`- **Author:** ${input.header.author}`);
  lines.push(`- **Source:** ${input.header.sourceUrl}`);
  const created = formatDate(input.header.createTime);
  if (created) lines.push(`- **Created:** ${created}`);
  const updated = formatDate(input.header.updateTime);
  if (updated) lines.push(`- **Updated:** ${updated}`);
  if (input.header.model) lines.push(`- **Model:** ${input.header.model}`);
  lines.push(`- **Exported:** ${input.header.exportedAt ?? new Date().toISOString()}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const message of input.messages) {
    lines.push(`## ${roleHeading(message, authorLabel, assistantLabel)}`);
    lines.push("");
    lines.push(
      ...renderMessageBody(message, input.relativePaths, input.failedKeys, input.failedReasons)
    );
  }

  return lines.join("\n").trimEnd() + "\n";
}

function renderMessageBody(
  message: ExportMessage,
  relativePaths: Map<string, string>,
  failedKeys?: Set<string>,
  failedReasons?: Map<string, string>
): string[] {
  const lines: string[] = [];
  for (const part of message.parts) {
    if (part.type === "text") {
      lines.push(part.text);
      lines.push("");
      continue;
    }

    const relative = relativePaths.get(part.attachment.key);
    const label =
      part.attachment.name ||
      (relative ? relative.split("/").pop() : undefined) ||
      part.attachment.fileId;
    if (relative) {
      if (part.attachment.isImage || looksLikeImage(relative)) {
        lines.push(`![${label}](${relative})`);
      } else {
        lines.push(`[${label}](${relative})`);
      }
      lines.push("");
      continue;
    }

    if (failedKeys?.has(part.attachment.key)) {
      const reason =
        failedReasons?.get(part.attachment.key) || `Attachment unavailable: ${label}`;
      lines.push(`*[${reason}]*`);
      lines.push("");
      continue;
    }

    lines.push(`*[Attachment pending: ${label}]*`);
    lines.push("");
  }
  return lines;
}

function roleHeading(
  message: ExportMessage,
  authorLabel: string,
  assistantLabel: string
): string {
  if (message.role === "user") return authorLabel;
  if (message.role === "assistant") return assistantLabel;
  if (message.role === "tool") return message.name ? `Tool (${message.name})` : "Tool";
  if (message.role === "system") return "System";
  return "Unknown";
}

function looksLikeImage(path: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path);
}
