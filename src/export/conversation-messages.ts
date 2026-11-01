import type {
  ChatgptContent,
  ChatgptConversation,
  ChatgptMappingNode,
  ChatgptMessage,
  ChatgptRole,
  ConversationAttachment,
  ExportMessage,
  MessagePart
} from "../chatgpt/types.js";
import { formatDate } from "../shared/format-date.js";

export function normalizeRole(role: string | undefined): ChatgptRole {
  if (role === "system" || role === "user" || role === "assistant" || role === "tool") return role;
  return "unknown";
}

/**
 * Returns the messages of the branch displayed in ChatGPT: walks up from
 * `current_node` to the root. Without `current_node`, follows the last child
 * at each fork (ChatGPT appends edits and regenerations as new children).
 */
export function extractMessagesInOrder(conversation: ChatgptConversation): ChatgptMessage[] {
  const nodes = conversation.mapping;
  if (!nodes) return [];

  const messages: ChatgptMessage[] = [];
  const visited = new Set<string>();
  let nodeId: string | null | undefined = resolveLeafId(conversation, nodes);
  while (nodeId && nodes[nodeId] && !visited.has(nodeId)) {
    visited.add(nodeId);
    const node: ChatgptMappingNode = nodes[nodeId];
    if (node.message?.content) messages.push(node.message);
    nodeId = node.parent;
  }
  return messages.reverse();
}

function resolveLeafId(
  conversation: ChatgptConversation,
  nodes: Record<string, ChatgptMappingNode>
): string | undefined {
  const current = conversation.current_node;
  if (typeof current === "string" && nodes[current]) return current;

  let nodeId = Object.entries(nodes).find(([, node]) => !node.parent || !nodes[node.parent])?.[0];
  const visited = new Set<string>();
  while (nodeId && !visited.has(nodeId)) {
    visited.add(nodeId);
    const children = (nodes[nodeId]?.children ?? []).filter((childId) => nodes[childId]);
    const next = children[children.length - 1];
    if (!next) return nodeId;
    nodeId = next;
  }
  return nodeId;
}

/** Convert the displayed branch into structured export messages (text + attachments). */
export function conversationToExportMessages(conversation: ChatgptConversation): ExportMessage[] {
  return extractMessagesInOrder(conversation)
    .map((message) => toExportMessage(message))
    .filter((message): message is ExportMessage => message !== null);
}

export function collectAttachments(messages: ExportMessage[]): ConversationAttachment[] {
  const byKey = new Map<string, ConversationAttachment>();
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "attachment") continue;
      if (!byKey.has(part.attachment.key)) byKey.set(part.attachment.key, part.attachment);
    }
  }
  return [...byKey.values()];
}

function toExportMessage(message: ChatgptMessage): ExportMessage | null {
  const parts = dedupeAttachmentParts(buildParts(message));
  if (parts.length === 0) return null;

  return {
    id: message.id,
    role: normalizeRole(message.author?.role),
    name: message.author?.name,
    create_time: formatDate(message.create_time),
    parts
  };
}

function dedupeAttachmentParts(parts: MessagePart[]): MessagePart[] {
  const seen = new Set<string>();
  const result: MessagePart[] = [];
  for (const part of parts) {
    if (part.type !== "attachment") {
      result.push(part);
      continue;
    }
    if (seen.has(part.attachment.key)) continue;
    seen.add(part.attachment.key);
    result.push(part);
  }
  return result;
}

function buildParts(message: ChatgptMessage): MessagePart[] {
  if (message.metadata?.is_visually_hidden_from_conversation) return [];

  const parts: MessagePart[] = [];
  const attachments = attachmentsFromMetadata(message);
  for (const attachment of attachments) {
    parts.push({ type: "attachment", attachment });
  }

  const content = message.content;
  if (!content) return parts;
  if (typeof content === "string") {
    const text = content.trim();
    if (text) parts.push({ type: "text", text });
    return parts;
  }

  if (content.content_type === "text" && Array.isArray(content.parts)) {
    const text = content.parts.filter((part): part is string => typeof part === "string").join("\n").trim();
    if (text) parts.push({ type: "text", text });
    return parts;
  }

  if (content.content_type === "code" && typeof content.text === "string") {
    parts.push({ type: "text", text: "```\n" + content.text + "\n```" });
    return parts;
  }

  if (content.content_type === "multimodal_text" && Array.isArray(content.parts)) {
    for (const part of content.parts) {
      if (typeof part === "string") {
        const text = part.trim();
        if (text) parts.push({ type: "text", text });
        continue;
      }
      if (!isContentPart(part) || typeof part.asset_pointer !== "string") continue;
      const attachment = attachmentFromPointer(part.asset_pointer, message.id, part);
      if (attachment) parts.push({ type: "attachment", attachment });
    }
    return finalizeToolParts(message, parts);
  }

  if (content.content_type === "tether_browsing_display") {
    const text = stringParts(content).join("\n").trim();
    if (text) parts.push({ type: "text", text: `> **Browsing Result:**\n>\n> ${text.replace(/\n/g, "\n> ")}` });
    return parts;
  }

  if (content.content_type === "thoughts") {
    const text = stringParts(content).join("\n").trim();
    if (text) parts.push({ type: "text", text: `<details>\n<summary>Thinking</summary>\n\n${text}\n\n</details>` });
    return parts;
  }

  if (content.content_type === "reasoning_recap") {
    const text = stringParts(content).join("\n").trim();
    if (text) parts.push({ type: "text", text: `*Reasoning recap: ${text}*` });
    return parts;
  }

  if (content.content_type === "model_editable_context") return [];

  return finalizeToolParts(message, parts);
}

function finalizeToolParts(message: ChatgptMessage, parts: MessagePart[]): MessagePart[] {
  if (message.author?.role !== "tool") return parts;
  const name = message.author.name || "unknown_tool";
  const textParts = parts.filter((part): part is { type: "text"; text: string } => part.type === "text");
  const otherParts = parts.filter((part) => part.type !== "text");
  if (textParts.length === 0) return otherParts;
  const merged = textParts.map((part) => part.text).join("\n");
  return [{ type: "text", text: `> **Tool (${name}):** ${merged}` }, ...otherParts];
}

function attachmentsFromMetadata(message: ChatgptMessage): ConversationAttachment[] {
  const raw = message.metadata?.attachments;
  if (!Array.isArray(raw)) return [];

  const result: ConversationAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : undefined;
    if (!id) continue;
    const name = typeof record.name === "string" ? record.name : undefined;
    const mimeType = typeof record.mime_type === "string" ? record.mime_type : undefined;
    result.push({
      key: `file-service:${id}`,
      fileId: id,
      kind: "file-service",
      name,
      mimeType,
      messageId: message.id,
      isImage: Boolean(mimeType?.startsWith("image/"))
    });
  }
  return result;
}

function attachmentFromPointer(
  pointer: string,
  messageId: string | undefined,
  part: ChatgptContent
): ConversationAttachment | undefined {
  const parsed = parseAssetPointer(pointer);
  if (!parsed) return undefined;
  const mimeType = typeof part.content_type === "string" && part.content_type.includes("image")
    ? "image/png"
    : undefined;
  return {
    key: `${parsed.kind}:${parsed.fileId}`,
    fileId: parsed.fileId,
    kind: parsed.kind,
    name: typeof part.metadata?.serialization_title === "string" ? part.metadata.serialization_title : undefined,
    mimeType,
    messageId,
    isImage: part.content_type === "image_asset_pointer" || Boolean(mimeType?.startsWith("image/"))
  };
}

export function parseAssetPointer(
  pointer: string
): { kind: ConversationAttachment["kind"]; fileId: string } | undefined {
  if (pointer.startsWith("file-service://")) {
    return { kind: "file-service", fileId: pointer.slice("file-service://".length) };
  }
  if (pointer.startsWith("sediment://")) {
    return { kind: "sediment", fileId: pointer.slice("sediment://".length) };
  }
  if (pointer.startsWith("file-")) {
    return { kind: "file-service", fileId: pointer };
  }
  return undefined;
}

function stringParts(content: ChatgptContent): string[] {
  return Array.isArray(content.parts)
    ? content.parts.filter((part): part is string => typeof part === "string")
    : [];
}

function isContentPart(value: unknown): value is ChatgptContent {
  return typeof value === "object" && value !== null;
}
