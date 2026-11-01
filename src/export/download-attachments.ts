import fs from "node:fs/promises";
import path from "node:path";
import { downloadFileBytes, resolveFileDownload, type FileClientOptions } from "../chatgpt/files.js";
import type { ConversationAttachment } from "../chatgpt/types.js";
import { formatAttachmentFailure } from "./attachment-failure.js";
import { sanitizeFileName } from "./slug.js";

export interface DownloadedAttachment {
  key: string;
  relativePath: string;
  absolutePath: string;
  fileName: string;
}

export interface DownloadAttachmentsResult {
  downloaded: DownloadedAttachment[];
  failedKeys: Set<string>;
  /** Human-readable failure note per attachment.key (for Markdown / HTML). */
  failedReasons: Map<string, string>;
  relativePaths: Map<string, string>;
}

/**
 * Download conversation attachments into `filesDir` and return relative paths
 * suitable for Markdown links (files/...). Failures soft-fail (export continues).
 */
export async function downloadAttachments(input: {
  attachments: ConversationAttachment[];
  filesDir: string;
  conversationId?: string;
  clientOptions?: FileClientOptions;
}): Promise<DownloadAttachmentsResult> {
  await fs.mkdir(input.filesDir, { recursive: true });

  const usedNames = new Set<string>();
  const downloaded: DownloadedAttachment[] = [];
  const failedKeys = new Set<string>();
  const failedReasons = new Map<string, string>();
  const relativePaths = new Map<string, string>();

  for (const attachment of input.attachments) {
    try {
      const meta = await resolveFileDownload(
        {
          fileId: attachment.fileId,
          kind: attachment.kind,
          conversationId: input.conversationId
        },
        input.clientOptions
      );
      const { bytes, contentType } = await downloadFileBytes(meta.downloadUrl, input.clientOptions);
      const fileName = uniqueFileName(
        pickFileName(attachment, meta.fileName, meta.mimeType || contentType),
        usedNames
      );
      const absolutePath = path.join(input.filesDir, fileName);
      await fs.writeFile(absolutePath, bytes);
      const relativePath = path.posix.join("files", fileName);
      downloaded.push({
        key: attachment.key,
        relativePath,
        absolutePath,
        fileName
      });
      relativePaths.set(attachment.key, relativePath);
    } catch (error) {
      // Never abort the whole export for one file (incl. user_mismatch / 403).
      failedKeys.add(attachment.key);
      failedReasons.set(attachment.key, formatAttachmentFailure(attachment, error));
    }
  }

  return { downloaded, failedKeys, failedReasons, relativePaths };
}

function pickFileName(
  attachment: ConversationAttachment,
  remoteName?: string,
  mimeType?: string
): string {
  if (attachment.name) return sanitizeFileName(attachment.name);
  if (remoteName) return sanitizeFileName(remoteName);

  const ext = extensionFromMime(mimeType) || (attachment.isImage ? ".png" : "");
  const base = sanitizeFileName(attachment.fileId.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 40), "file");
  return `${base}${ext}`;
}

function extensionFromMime(mimeType?: string): string {
  if (!mimeType) return "";
  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "application/json": ".json",
    "text/csv": ".csv"
  };
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase();
  return (normalized && map[normalized]) || "";
}

function uniqueFileName(name: string, used: Set<string>): string {
  if (!used.has(name.toLowerCase())) {
    used.add(name.toLowerCase());
    return name;
  }

  const ext = path.extname(name);
  const stem = path.basename(name, ext) || "file";
  let index = 2;
  while (used.has(`${stem}-${index}${ext}`.toLowerCase())) index += 1;
  const next = `${stem}-${index}${ext}`;
  used.add(next.toLowerCase());
  return next;
}
