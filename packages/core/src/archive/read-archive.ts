import fs from "node:fs/promises";
import path from "node:path";
import type { ChatgptConversation } from "../chatgpt/types.js";
import { AppError } from "../shared/errors.js";

export const ARCHIVE_CONVERSATIONS_FILE = "conversations.json";

export interface ChatgptExportArchive {
  /** Directory that holds conversations.json and the attachment files. */
  rootDir: string;
  conversationsFile: string;
  conversations: ChatgptConversation[];
}

export interface ArchiveConversationSummary {
  id: string;
  title: string;
  createTime?: number | string | null;
  updateTime?: number | string | null;
  messageCount: number;
}

/**
 * Read an unzipped ChatGPT data export. `archivePath` may point at the export
 * directory or directly at its conversations.json.
 */
export async function readExportArchive(archivePath: string): Promise<ChatgptExportArchive> {
  const conversationsFile = await resolveConversationsFile(archivePath);
  const raw = await readJsonFile(conversationsFile);
  if (!Array.isArray(raw)) {
    throw new AppError(
      "ARCHIVE_INVALID",
      `${conversationsFile} must contain a JSON array of conversations.`
    );
  }

  const conversations = raw.filter(isConversationLike).map(normalizeArchiveConversation);
  if (conversations.length === 0) {
    throw new AppError("ARCHIVE_INVALID", `${conversationsFile} contains no readable conversation.`);
  }

  return { rootDir: path.dirname(conversationsFile), conversationsFile, conversations };
}

/** Listing data for a conversation picker, newest activity first. */
export function summarizeArchive(archive: ChatgptExportArchive): ArchiveConversationSummary[] {
  return archive.conversations
    .map((conversation) => ({
      id: archiveConversationId(conversation),
      title: conversation.title?.trim() || "Untitled",
      createTime: conversation.create_time,
      updateTime: conversation.update_time,
      messageCount: Object.keys(conversation.mapping ?? {}).length
    }))
    .sort((left, right) => sortKey(right) - sortKey(left));
}

export function findArchiveConversation(
  archive: ChatgptExportArchive,
  conversationId: string
): ChatgptConversation {
  const found = archive.conversations.find(
    (conversation) => archiveConversationId(conversation) === conversationId
  );
  if (!found) {
    throw new AppError(
      "ARCHIVE_CONVERSATION_NOT_FOUND",
      `Conversation ${conversationId} is not present in ${archive.conversationsFile}.`
    );
  }
  return found;
}

export function archiveConversationId(conversation: ChatgptConversation): string {
  return conversation.conversation_id || conversation.id || "unknown";
}

async function resolveConversationsFile(archivePath: string): Promise<string> {
  const resolved = path.resolve(archivePath);
  const stats = await statOrThrow(resolved);
  if (stats.isDirectory()) {
    const candidate = path.join(resolved, ARCHIVE_CONVERSATIONS_FILE);
    await statOrThrow(candidate);
    return candidate;
  }
  if (path.extname(resolved).toLowerCase() === ".zip") {
    throw new AppError(
      "ARCHIVE_NOT_FOUND",
      `${resolved} is a zip archive. Unzip the ChatGPT export first, then point at the extracted folder.`
    );
  }
  return resolved;
}

async function statOrThrow(target: string): Promise<{ isDirectory(): boolean }> {
  try {
    return await fs.stat(target);
  } catch {
    throw new AppError("ARCHIVE_NOT_FOUND", `${target} does not exist or is not readable.`);
  }
}

async function readJsonFile(filePath: string): Promise<unknown> {
  let text: string;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new AppError(
      "ARCHIVE_NOT_FOUND",
      `Could not read ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new AppError(
      "ARCHIVE_INVALID",
      `${filePath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function normalizeArchiveConversation(entry: ChatgptConversation): ChatgptConversation {
  const model = entry.model || stringField(entry, "default_model_slug");
  return { ...entry, model };
}

function stringField(entry: ChatgptConversation, key: string): string | undefined {
  const value = entry[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function sortKey(summary: ArchiveConversationSummary): number {
  const value = summary.updateTime ?? summary.createTime;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed / 1000;
  }
  return 0;
}

function isConversationLike(value: unknown): value is ChatgptConversation {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.mapping === "object" && entry.mapping !== null;
}
