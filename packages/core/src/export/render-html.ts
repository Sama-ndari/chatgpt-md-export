import type { ExportMessage, MessagePart } from "../chatgpt/types.js";
import { BUILDER_NAME, BUILDER_URL, TOOL_NAME } from "../shared/branding.js";
import { formatDate } from "../shared/format-date.js";
import { CHAT_STYLES } from "./render-html-styles.js";
import type { MarkdownHeaderInput } from "./render-markdown.js";

export interface RenderHtmlInput {
  header: MarkdownHeaderInput;
  messages: ExportMessage[];
  relativePaths: Map<string, string>;
  failedKeys?: Set<string>;
  failedReasons?: Map<string, string>;
  authorLabel?: string;
  assistantLabel?: string;
  /** Start with message bodies expanded. Default: collapsed. */
  expandMessages?: boolean;
}

/**
 * Render a standalone HTML chat page with working expand/collapse
 * (open in a browser, since Markdown preview often ignores details tags).
 */
export function renderConversationHtml(input: RenderHtmlInput): string {
  return renderDocument({
    header: input.header,
    messageCount: input.messages.length,
    messagesHtml: renderMessagesHtml(input)
  });
}

function renderMessagesHtml(input: RenderHtmlInput): string {
  const openAttr = input.expandMessages === true ? " open" : "";
  return input.messages
    .map((message, index) =>
      renderMessageCard({
        message,
        index: index + 1,
        authorLabel: input.authorLabel ?? "Author",
        assistantLabel: input.assistantLabel ?? "Assistant",
        relativePaths: input.relativePaths,
        failedKeys: input.failedKeys,
        failedReasons: input.failedReasons,
        openAttr
      })
    )
    .join("\n");
}

function renderHeaderSection(header: MarkdownHeaderInput, count: number): string {
  return `    <header class="header">
      <p class="eyebrow">ChatGPT export</p>
      <h1>${escapeHtml(header.title)}</h1>
      <ul class="meta">${renderMetaList(header)}</ul>
      <div class="toolbar">
        <span class="count">${count} message${count === 1 ? "" : "s"}</span>
        <div class="toolbar-actions">
          <button type="button" id="expand-all">Expand all</button>
          <button type="button" id="collapse-all">Collapse all</button>
        </div>
      </div>
    </header>`;
}

function renderDocument(input: {
  header: MarkdownHeaderInput;
  messageCount: number;
  messagesHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.header.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>${CHAT_STYLES}</style>
</head>
<body>
  <div class="atmosphere" aria-hidden="true"></div>
  <main class="page">
${renderHeaderSection(input.header, input.messageCount)}
    <section class="thread" aria-label="Conversation">
${input.messagesHtml}
    </section>
    <footer class="export-credit">
      <p>${renderCredit()}</p>
    </footer>
  </main>
  <script>
    const setAll = (open) => {
      document.querySelectorAll("details.message-body").forEach((el) => {
        el.open = open;
      });
    };
    document.getElementById("expand-all")?.addEventListener("click", () => setAll(true));
    document.getElementById("collapse-all")?.addEventListener("click", () => setAll(false));
  </script>
</body>
</html>
`;
}

function renderMetaList(header: MarkdownHeaderInput): string {
  const rows: Array<[string, string]> = [
    ["Author", header.author],
    ["Source", header.sourceUrl]
  ];
  const created = formatDate(header.createTime);
  if (created) rows.push(["Created", created]);
  const updated = formatDate(header.updateTime);
  if (updated) rows.push(["Updated", updated]);
  if (header.model) rows.push(["Model", header.model]);
  rows.push(["Exported", header.exportedAt ?? new Date().toISOString()]);

  return rows
    .map(([label, value]) => {
      if (label === "Source") {
        return `<li><span>${label}</span><a href="${escapeHtml(value)}">${escapeHtml(value)}</a></li>`;
      }
      return `<li><span>${label}</span>${escapeHtml(value)}</li>`;
    })
    .join("");
}

function renderMessageCard(input: {
  message: ExportMessage;
  index: number;
  authorLabel: string;
  assistantLabel: string;
  relativePaths: Map<string, string>;
  failedKeys?: Set<string>;
  failedReasons?: Map<string, string>;
  openAttr: string;
}): string {
  const role = roleHeading(input.message, input.authorLabel, input.assistantLabel);
  const roleClass = cssRole(input.message.role);
  const preview = escapeHtml(messagePreview(input.message.parts));
  const body = renderPartsHtml(
    input.message.parts,
    input.relativePaths,
    input.failedKeys,
    input.failedReasons
  );
  return `      <article class="message ${roleClass}">
        <div class="bubble">
          <div class="role-row">
            <span class="role">${escapeHtml(role)}</span>
            <span class="index">#${input.index}</span>
          </div>
          <details class="message-body"${input.openAttr}>
            <summary>
              <span class="chevron" aria-hidden="true"></span>
              <span class="preview">${preview || "Show / hide message"}</span>
              <span class="toggle-hint">show</span>
            </summary>
            <div class="content">${body}</div>
          </details>
        </div>
      </article>`;
}

function renderPartsHtml(
  parts: MessagePart[],
  relativePaths: Map<string, string>,
  failedKeys?: Set<string>,
  failedReasons?: Map<string, string>
): string {
  const chunks: string[] = [];
  for (const part of parts) {
    if (part.type === "text") {
      chunks.push(`<div class="text">${escapeHtml(part.text)}</div>`);
      continue;
    }
    const relative = relativePaths.get(part.attachment.key);
    const label =
      part.attachment.name ||
      (relative ? relative.split("/").pop() : undefined) ||
      part.attachment.fileId;
    if (relative) {
      const href = escapeHtml(relative);
      const safeLabel = escapeHtml(label);
      if (part.attachment.isImage || looksLikeImage(relative)) {
        chunks.push(`<p class="asset"><img src="${href}" alt="${safeLabel}" loading="lazy" /></p>`);
      } else {
        chunks.push(`<p class="asset"><a class="file-link" href="${href}">${safeLabel}</a></p>`);
      }
      continue;
    }
    if (failedKeys?.has(part.attachment.key)) {
      const reason =
        failedReasons?.get(part.attachment.key) || `Attachment unavailable: ${label}`;
      chunks.push(`<p class="missing">${escapeHtml(reason)}</p>`);
      continue;
    }
    chunks.push(`<p class="missing">Attachment pending: ${escapeHtml(label)}</p>`);
  }
  return chunks.join("\n");
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

function cssRole(role: ExportMessage["role"]): string {
  if (role === "user") return "role-author";
  if (role === "assistant") return "role-assistant";
  if (role === "tool") return "role-tool";
  return "role-other";
}

function messagePreview(parts: MessagePart[], maxLen = 110): string {
  for (const part of parts) {
    if (part.type !== "text") continue;
    const compact = part.text.replace(/\s+/g, " ").trim();
    if (!compact) continue;
    if (compact.length <= maxLen) return compact;
    return `${compact.slice(0, maxLen - 1).trimEnd()}…`;
  }
  const attachment = parts.find((part) => part.type === "attachment");
  if (attachment && attachment.type === "attachment") {
    return attachment.attachment.name || "attachment";
  }
  return "";
}

/** Footer credit with the builder name linked to their site. */
function renderCredit(): string {
  const link = `<a href="${BUILDER_URL}" target="_blank" rel="noopener noreferrer">${escapeHtml(BUILDER_NAME)}</a>`;
  return `Exported with ${escapeHtml(TOOL_NAME)} \u00b7 built by ${link}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function looksLikeImage(path: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path);
}
