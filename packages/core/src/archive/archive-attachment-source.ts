import fs from "node:fs/promises";
import path from "node:path";
import type { AttachmentSource, FetchedAttachment } from "../export/attachment-source.js";
import type { ConversationAttachment } from "../chatgpt/types.js";
import { AppError } from "../shared/errors.js";

const MAX_SCAN_DEPTH = 4;

/**
 * Attachment source backed by the files shipped inside an unzipped ChatGPT
 * export. Files are named `{fileId}-{original name}`, so the index is keyed by
 * that prefix and falls back to a substring match.
 */
export function createArchiveAttachmentSource(rootDir: string): AttachmentSource {
  let index: Promise<Map<string, string>> | undefined;

  return {
    async fetch(attachment: ConversationAttachment): Promise<FetchedAttachment> {
      index ??= buildFileIndex(rootDir);
      const filePath = locateFile(await index, attachment.fileId);
      if (!filePath) {
        throw new AppError(
          "FILE_NOT_IN_ARCHIVE",
          `File ${attachment.fileId} is not present in the export archive at ${rootDir}.`
        );
      }

      try {
        return { bytes: await fs.readFile(filePath), fileName: path.basename(filePath) };
      } catch (error) {
        throw new AppError(
          "FILE_DOWNLOAD_FAILED",
          `Could not read ${filePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  };
}

function locateFile(index: Map<string, string>, fileId: string): string | undefined {
  const direct = index.get(fileId.toLowerCase());
  if (direct) return direct;

  const needle = fileId.toLowerCase();
  for (const [key, filePath] of index) {
    if (key.includes(needle)) return filePath;
  }
  return undefined;
}

async function buildFileIndex(rootDir: string): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  await indexDirectory(rootDir, index, 0);
  return index;
}

async function indexDirectory(
  dir: string,
  index: Map<string, string>,
  depth: number
): Promise<void> {
  if (depth > MAX_SCAN_DEPTH) return;

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await indexDirectory(fullPath, index, depth + 1);
      continue;
    }
    if (!entry.isFile()) continue;
    registerFile(index, entry.name, fullPath);
  }
}

function registerFile(index: Map<string, string>, fileName: string, fullPath: string): void {
  const lower = fileName.toLowerCase();
  if (!index.has(lower)) index.set(lower, fullPath);

  const fileIdPrefix = lower.match(/^(file[-_][0-9a-z]+)/)?.[1];
  if (fileIdPrefix && !index.has(fileIdPrefix)) index.set(fileIdPrefix, fullPath);
}
