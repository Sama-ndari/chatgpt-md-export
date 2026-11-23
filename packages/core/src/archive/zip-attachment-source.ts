import path from "node:path";
import type { AttachmentSource, FetchedAttachment } from "../export/attachment-source.js";
import type { ConversationAttachment } from "../chatgpt/types.js";
import { AppError } from "../shared/errors.js";
import type { ZipArchive, ZipEntry } from "./zip-reader.js";

/**
 * Attachment source backed by a still zipped ChatGPT export. Entries are named
 * `{fileId}-{original name}`, the same convention the unzipped export uses, so
 * the lookup mirrors the directory source and avoids extracting the archive.
 */
export function createZipAttachmentSource(zip: ZipArchive): AttachmentSource {
  const index = buildEntryIndex(zip.entries);

  return {
    async fetch(attachment: ConversationAttachment): Promise<FetchedAttachment> {
      const entry = locateEntry(index, attachment.fileId);
      if (!entry) {
        throw new AppError(
          "FILE_NOT_IN_ARCHIVE",
          `File ${attachment.fileId} is not present in the export archive at ${zip.filePath}.`
        );
      }

      return { bytes: await zip.read(entry), fileName: path.posix.basename(entry.name) };
    }
  };
}

function buildEntryIndex(entries: ZipEntry[]): Map<string, ZipEntry> {
  const index = new Map<string, ZipEntry>();
  for (const entry of entries) {
    if (entry.name.endsWith("/")) continue;
    const fileName = path.posix.basename(entry.name).toLowerCase();
    if (!index.has(fileName)) index.set(fileName, entry);

    const fileIdPrefix = fileName.match(/^(file[-_][0-9a-z]+)/)?.[1];
    if (fileIdPrefix && !index.has(fileIdPrefix)) index.set(fileIdPrefix, entry);
  }
  return index;
}

function locateEntry(index: Map<string, ZipEntry>, fileId: string): ZipEntry | undefined {
  const needle = fileId.toLowerCase();
  const direct = index.get(needle);
  if (direct) return direct;

  for (const [key, entry] of index) {
    if (key.includes(needle)) return entry;
  }
  return undefined;
}
