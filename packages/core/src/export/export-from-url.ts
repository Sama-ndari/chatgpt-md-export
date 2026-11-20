import {
  fetchPrivateConversation,
  fetchProjectConversation,
  fetchSharedConversation,
  type ChatgptClientOptions
} from "../chatgpt/chatgpt-client.js";
import type { ChatgptConversation } from "../chatgpt/types.js";
import { parseChatgptUrl, type ParsedChatgptUrl } from "../chatgpt/url-parser.js";
import { AppError } from "../shared/errors.js";
import { createApiAttachmentSource } from "./api-attachment-source.js";
import {
  writeConversationExport,
  type ConversationExportResult
} from "./export-conversation.js";

export interface ExportFromUrlInput {
  url: string;
  /** Absolute directory that receives the export folder. */
  outRoot: string;
  author?: string;
  skipAttachments?: boolean;
  clientOptions?: ChatgptClientOptions;
  env?: NodeJS.ProcessEnv;
}

/** Fetch a ChatGPT conversation, share, or project URL and write its export. */
export async function exportConversationFromUrl(
  input: ExportFromUrlInput
): Promise<ConversationExportResult> {
  const parsed = parseChatgptUrl(input.url);
  const conversation = await fetchRemoteConversation(parsed, input.clientOptions);

  return writeConversationExport({
    conversation,
    outRoot: input.outRoot,
    sourceUrl: parsed.sourceUrl,
    folderId: parsed.cacheId,
    author: resolveAuthor(input.author, input.clientOptions?.env ?? input.env),
    attachments: input.skipAttachments
      ? undefined
      : createApiAttachmentSource({
          conversationId: resolveAttachmentConversationId(parsed, conversation),
          clientOptions: input.clientOptions
        })
  });
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
      throw new AppError(
        "UNSUPPORTED_URL",
        "ChatGPT project URL is missing a recognizable project id."
      );
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

/** Shares expose the real conversation id, which sediment downloads require. */
function resolveAttachmentConversationId(
  parsed: ParsedChatgptUrl,
  conversation: ChatgptConversation
): string | undefined {
  const original = conversation.original_conversation_id;
  if (typeof original === "string" && original) return original;
  return parsed.kind === "share" ? undefined : parsed.id;
}

function resolveAuthor(explicit: string | undefined, env?: NodeJS.ProcessEnv): string {
  return explicit?.trim() || env?.CHATGPT_AUTHOR_NAME?.trim() || "User";
}
