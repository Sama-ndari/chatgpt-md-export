import { downloadFileBytes, resolveFileDownload, type FileClientOptions } from "../chatgpt/files.js";
import type { ConversationAttachment } from "../chatgpt/types.js";
import type { AttachmentSource, FetchedAttachment } from "./attachment-source.js";

export interface ApiAttachmentSourceInput {
  /** Needed to resolve `sediment://` pointers, which are conversation-scoped. */
  conversationId?: string;
  clientOptions?: FileClientOptions;
}

/** Attachment source backed by the ChatGPT backend-api signed download flow. */
export function createApiAttachmentSource(input: ApiAttachmentSourceInput): AttachmentSource {
  return {
    async fetch(attachment: ConversationAttachment): Promise<FetchedAttachment> {
      const meta = await resolveFileDownload(
        {
          fileId: attachment.fileId,
          kind: attachment.kind,
          conversationId: input.conversationId
        },
        input.clientOptions
      );
      const { bytes, contentType } = await downloadFileBytes(meta.downloadUrl, input.clientOptions);
      return {
        bytes,
        fileName: meta.fileName,
        mimeType: meta.mimeType || contentType
      };
    }
  };
}
