export type ChatgptRole = "system" | "user" | "assistant" | "tool" | "unknown";

export interface ChatgptAuthor {
  role?: string;
  name?: string;
}

export interface ChatgptContent {
  content_type?: string;
  parts?: unknown[];
  text?: string;
  asset_pointer?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ChatgptMessage {
  id?: string;
  author?: ChatgptAuthor;
  create_time?: number | string | null;
  content?: ChatgptContent | string | null;
  metadata?: Record<string, unknown>;
}

export interface ChatgptMappingNode {
  id?: string;
  message?: ChatgptMessage | null;
  parent?: string | null;
  children?: string[];
}

export interface ChatgptConversation {
  id?: string;
  conversation_id?: string;
  title?: string;
  create_time?: number | string | null;
  update_time?: number | string | null;
  model?: string;
  gizmo_id?: string;
  mapping?: Record<string, ChatgptMappingNode>;
  /** Leaf node of the branch currently displayed in ChatGPT. */
  current_node?: string;
  [key: string]: unknown;
}

export type AttachmentKind = "file-service" | "sediment" | "unknown";

export interface ConversationAttachment {
  key: string;
  fileId: string;
  kind: AttachmentKind;
  name?: string;
  mimeType?: string;
  messageId?: string;
  isImage: boolean;
}

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "attachment"; attachment: ConversationAttachment };

export interface ExportMessage {
  id?: string;
  role: ChatgptRole;
  name?: string;
  create_time?: string;
  parts: MessagePart[];
}
