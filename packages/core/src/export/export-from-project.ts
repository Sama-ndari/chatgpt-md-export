import { fetchProjectConversation, type ChatgptClientOptions } from "../chatgpt/chatgpt-client.js";
import type { ProjectConversationSummary } from "../chatgpt/project-conversations.js";
import { createApiAttachmentSource } from "./api-attachment-source.js";
import {
  writeConversationExport,
  type ConversationExportResult
} from "./export-conversation.js";
import type { BatchExportResult, FailedConversationExport } from "./export-from-archive.js";
import type { ProgressReporter } from "./progress.js";

export interface ExportProjectInput {
  projectId: string;
  /** Conversations to write, as returned by `listProjectConversations`. */
  conversations: ProjectConversationSummary[];
  /** Absolute directory that receives the export folders. */
  outRoot: string;
  author?: string;
  skipAttachments?: boolean;
  onProgress?: ProgressReporter;
  clientOptions?: ChatgptClientOptions;
}

/**
 * Write every selected conversation of a project. One request per
 * conversation, because the project listing carries no message content.
 * A conversation that fails is recorded and the run continues.
 */
export async function exportConversationsFromProject(
  input: ExportProjectInput
): Promise<BatchExportResult> {
  const exports: ConversationExportResult[] = [];
  const failures: FailedConversationExport[] = [];
  const author = resolveAuthor(input.author, input.clientOptions?.env);

  for (const [index, summary] of input.conversations.entries()) {
    input.onProgress?.({
      stage: "conversation",
      completed: index,
      total: input.conversations.length,
      title: summary.title
    });

    try {
      exports.push(await exportOne({ summary, author, input }));
    } catch (error) {
      failures.push({
        conversationId: summary.id,
        title: summary.title,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return { exports, failures };
}

async function exportOne(context: {
  summary: ProjectConversationSummary;
  author: string;
  input: ExportProjectInput;
}): Promise<ConversationExportResult> {
  const { summary, author, input } = context;
  const conversation = await fetchProjectConversation(
    { conversationId: summary.id, projectId: input.projectId, sourceUrl: summary.url },
    input.clientOptions
  );

  return writeConversationExport({
    conversation,
    outRoot: input.outRoot,
    sourceUrl: summary.url,
    folderId: summary.id,
    author,
    attachments: input.skipAttachments
      ? undefined
      : createApiAttachmentSource({
          conversationId: summary.id,
          clientOptions: input.clientOptions
        })
  });
}

function resolveAuthor(explicit: string | undefined, env?: NodeJS.ProcessEnv): string {
  return explicit?.trim() || env?.CHATGPT_AUTHOR_NAME?.trim() || "User";
}
