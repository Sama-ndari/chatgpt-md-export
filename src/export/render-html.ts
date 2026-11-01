import type { ExportMessage, MessagePart } from "../chatgpt/types.js";
import { formatDate } from "../shared/format-date.js";
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
 * (open in a browser — Markdown preview often ignores details tags).
 */
export function renderConversationHtml(input: RenderHtmlInput): string {
  const authorLabel = input.authorLabel ?? "Author";
  const assistantLabel = input.assistantLabel ?? "Assistant";
  const openAttr = input.expandMessages === true ? " open" : "";
  const meta = renderMetaList(input.header);
  const count = input.messages.length;
  const messagesHtml = input.messages
    .map((message, index) =>
      renderMessageCard({
        message,
        index: index + 1,
        authorLabel,
        assistantLabel,
        relativePaths: input.relativePaths,
        failedKeys: input.failedKeys,
        failedReasons: input.failedReasons,
        openAttr
      })
    )
    .join("\n");

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
    <header class="header">
      <p class="eyebrow">ChatGPT export</p>
      <h1>${escapeHtml(input.header.title)}</h1>
      <ul class="meta">${meta}</ul>
      <div class="toolbar">
        <span class="count">${count} message${count === 1 ? "" : "s"}</span>
        <div class="toolbar-actions">
          <button type="button" id="expand-all">Expand all</button>
          <button type="button" id="collapse-all">Collapse all</button>
        </div>
      </div>
    </header>
    <section class="thread" aria-label="Conversation">
${messagesHtml}
    </section>
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

const CHAT_STYLES = `
:root {
  --ink: #14212b;
  --muted: #5b6b78;
  --line: #c9d5df;
  --paper: #f7fafc;
  --author-bg: #dfeaf7;
  --author-ink: #1e3a5f;
  --assistant-bg: #ffffff;
  --assistant-ink: #0f3d38;
  --tool-bg: #f3efe6;
  --tool-ink: #6b5420;
  --accent: #0f766e;
  --shadow: 0 10px 30px rgba(20, 33, 43, 0.08);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink);
  font: 16px/1.55 "Source Sans 3", sans-serif;
  background: #d9e3ea;
}
.atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(900px 480px at 12% -10%, rgba(15, 118, 110, 0.18), transparent 60%),
    radial-gradient(700px 420px at 100% 0%, rgba(30, 58, 95, 0.16), transparent 55%),
    linear-gradient(180deg, #e7eef3 0%, #d5e0e8 100%);
  z-index: 0;
}
.page {
  position: relative;
  z-index: 1;
  max-width: 820px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4.5rem;
}
.header {
  margin-bottom: 1.5rem;
  padding: 1.4rem 1.5rem 1.2rem;
  border: 1px solid rgba(201, 213, 223, 0.9);
  border-radius: 1.25rem;
  background: rgba(247, 250, 252, 0.88);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow);
}
.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent);
}
.header h1 {
  margin: 0 0 0.9rem;
  font-family: Fraunces, Georgia, serif;
  font-size: clamp(1.6rem, 3vw, 2.15rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
}
.meta {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.35rem;
}
.meta li {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 0.6rem;
  font-size: 0.92rem;
  color: var(--ink);
  word-break: break-word;
}
.meta li span {
  color: var(--muted);
  font-weight: 600;
}
.meta a { color: #1d4f91; text-decoration: none; }
.meta a:hover { text-decoration: underline; }
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1.1rem;
  padding-top: 0.95rem;
  border-top: 1px solid var(--line);
}
.count {
  font-size: 0.86rem;
  font-weight: 700;
  color: var(--muted);
  letter-spacing: 0.02em;
}
.toolbar-actions { display: flex; gap: 0.5rem; }
.toolbar button {
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink);
  border-radius: 999px;
  padding: 0.45rem 0.95rem;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  font-size: 0.88rem;
  transition: background 0.15s ease, transform 0.15s ease;
}
.toolbar button:hover {
  background: #eef5f8;
  transform: translateY(-1px);
}
.thread {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.message { display: flex; width: 100%; }
.message.role-author { justify-content: flex-end; }
.message.role-assistant,
.message.role-tool,
.message.role-other { justify-content: flex-start; }
.bubble {
  width: min(100%, 680px);
  border-radius: 1.1rem;
  border: 1px solid transparent;
  padding: 0.85rem 1rem 0.75rem;
  box-shadow: var(--shadow);
}
.role-author .bubble {
  background: var(--author-bg);
  border-color: #c5d6ea;
  border-bottom-right-radius: 0.35rem;
}
.role-assistant .bubble {
  background: var(--assistant-bg);
  border-color: #d5e1e8;
  border-bottom-left-radius: 0.35rem;
}
.role-tool .bubble,
.role-other .bubble {
  background: var(--tool-bg);
  border-color: #e2d7bf;
  width: min(100%, 640px);
}
.role-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}
.role {
  font-family: Fraunces, Georgia, serif;
  font-weight: 700;
  font-size: 1.02rem;
}
.role-author .role { color: var(--author-ink); }
.role-assistant .role { color: var(--assistant-ink); }
.role-tool .role,
.role-other .role { color: var(--tool-ink); }
.index {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted);
  opacity: 0.8;
}
.message-body > summary {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  cursor: pointer;
  list-style: none;
  user-select: none;
  padding: 0.35rem 0.15rem;
  border-radius: 0.55rem;
}
.message-body > summary::-webkit-details-marker { display: none; }
.message-body > summary:hover { background: rgba(20, 33, 43, 0.04); }
.chevron {
  width: 0.55rem;
  height: 0.55rem;
  margin-top: 0.45rem;
  border-right: 2px solid var(--muted);
  border-bottom: 2px solid var(--muted);
  transform: rotate(-45deg);
  transition: transform 0.18s ease;
  flex: 0 0 auto;
}
.message-body[open] > summary .chevron { transform: rotate(45deg); }
.preview {
  flex: 1;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.4;
}
.toggle-hint {
  flex: 0 0 auto;
  margin-top: 0.1rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}
.message-body[open] > summary .toggle-hint { content: "hide"; }
.message-body[open] > summary .toggle-hint::after { }
.message-body[open] > summary .toggle-hint { visibility: hidden; position: relative; }
.message-body[open] > summary .toggle-hint::before {
  visibility: visible;
  content: "hide";
  position: absolute;
  right: 0;
}
.content {
  margin-top: 0.55rem;
  padding: 0.85rem 0.15rem 0.25rem;
  border-top: 1px solid rgba(201, 213, 223, 0.85);
  animation: rise 0.18s ease;
}
@keyframes rise {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.text {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.98rem;
}
.asset { margin: 0.65rem 0 0; }
.asset img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 0.7rem;
  border: 1px solid var(--line);
}
.file-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.7rem;
  border-radius: 0.55rem;
  background: #eef5f8;
  color: #1d4f91;
  text-decoration: none;
  font-weight: 600;
}
.file-link:hover { text-decoration: underline; }
.missing {
  margin: 0.5rem 0 0;
  color: var(--muted);
  font-style: italic;
  font-size: 0.92rem;
}
@media (max-width: 640px) {
  .page { padding: 1.25rem 0.85rem 3rem; }
  .header { padding: 1.1rem; border-radius: 1rem; }
  .meta li { grid-template-columns: 1fr; gap: 0.1rem; }
  .bubble { width: 100%; }
}
`.trim();
