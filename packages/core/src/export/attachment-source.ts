import type { ConversationAttachment } from "../chatgpt/types.js";

/** Raw bytes plus whatever naming hints the source could provide. */
export interface FetchedAttachment {
  bytes: Buffer;
  fileName?: string;
  mimeType?: string;
}

/**
 * Where attachment bytes come from. The ChatGPT backend-api and a local
 * official export archive both satisfy this contract, so the export writer
 * stays independent of the transport.
 */
export interface AttachmentSource {
  fetch(attachment: ConversationAttachment): Promise<FetchedAttachment>;
}
