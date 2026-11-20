import { createArchiveAttachmentSource } from "../archive/archive-attachment-source.js";
import {
  archiveConversationId,
  findArchiveConversation,
  summarizeArchive,
  type ChatgptExportArchive
} from "../archive/read-archive.js";
import type { ProgressReporter } from "./progress.js";
import {
  writeConversationExport,
  type ConversationExportResult
} from "./export-conversation.js";

export interface ExportFromArchiveInput {
  archive: ChatgptExportArchive;
  /** Omit to export the most recently updated conversation in the archive. */
  conversationId?: string;
  /** Absolute directory that receives the export folder. */
  outRoot: string;
  author?: string;
  skipAttachments?: boolean;
  onProgress?: ProgressReporter;
}

/** Write one conversation out of an unzipped official ChatGPT export. */
export async function exportConversationFromArchive(
  input: ExportFromArchiveInput
): Promise<ConversationExportResult> {
  input.onProgress?.({ stage: "reading" });
  const conversationId = input.conversationId ?? summarizeArchive(input.archive)[0]?.id;
  const conversation = conversationId
    ? findArchiveConversation(input.archive, conversationId)
    : input.archive.conversations[0];

  return writeConversationExport({
    conversation,
    outRoot: input.outRoot,
    sourceUrl: input.archive.conversationsFile,
    folderId: archiveConversationId(conversation),
    author: input.author?.trim() || "User",
    onProgress: input.onProgress,
    attachments: input.skipAttachments
      ? undefined
      : createArchiveAttachmentSource(input.archive.rootDir)
  });
}
