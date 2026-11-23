import { createArchiveAttachmentSource } from "../archive/archive-attachment-source.js";
import { createZipAttachmentSource } from "../archive/zip-attachment-source.js";
import {
  archiveConversationId,
  findArchiveConversation,
  summarizeArchive,
  type ChatgptExportArchive
} from "../archive/read-archive.js";
import type { AttachmentSource } from "./attachment-source.js";
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
    attachments: input.skipAttachments ? undefined : archiveAttachments(input.archive)
  });
}

export interface ExportManyFromArchiveInput {
  archive: ChatgptExportArchive;
  /** Conversations to write, in the order given. */
  conversationIds: string[];
  /** Absolute directory that receives the export folders. */
  outRoot: string;
  author?: string;
  skipAttachments?: boolean;
  onProgress?: ProgressReporter;
}

/** One conversation that could not be written, so a batch can keep going. */
export interface FailedConversationExport {
  conversationId: string;
  title: string;
  reason: string;
}

export interface BatchExportResult {
  exports: ConversationExportResult[];
  failures: FailedConversationExport[];
}

/**
 * Write several conversations out of one export archive. A conversation that
 * fails is recorded and the batch continues, because a single unreadable entry
 * should not cost the user the other hundred.
 */
export async function exportConversationsFromArchive(
  input: ExportManyFromArchiveInput
): Promise<BatchExportResult> {
  const attachments = input.skipAttachments ? undefined : archiveAttachments(input.archive);
  const titles = conversationTitles(input.archive);
  const result: BatchExportResult = { exports: [], failures: [] };

  for (const [index, conversationId] of input.conversationIds.entries()) {
    const title = titles.get(conversationId) ?? conversationId;
    input.onProgress?.({
      stage: "conversation",
      completed: index,
      total: input.conversationIds.length,
      title
    });

    try {
      const conversation = findArchiveConversation(input.archive, conversationId);
      result.exports.push(
        await writeConversationExport({
          conversation,
          outRoot: input.outRoot,
          sourceUrl: input.archive.conversationsFile,
          folderId: archiveConversationId(conversation),
          author: input.author?.trim() || "User",
          attachments
        })
      );
    } catch (error) {
      result.failures.push({ conversationId, title, reason: describe(error) });
    }
  }

  return result;
}

function conversationTitles(archive: ChatgptExportArchive): Map<string, string> {
  return new Map(summarizeArchive(archive).map((summary) => [summary.id, summary.title]));
}

function archiveAttachments(archive: ChatgptExportArchive): AttachmentSource {
  return archive.zip
    ? createZipAttachmentSource(archive.zip)
    : createArchiveAttachmentSource(archive.rootDir);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
