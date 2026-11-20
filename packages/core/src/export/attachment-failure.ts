import type { ConversationAttachment } from "../chatgpt/types.js";
import { AppError } from "../shared/errors.js";

/** User-facing note when an attachment could not be downloaded. */
export function formatAttachmentFailure(
  attachment: ConversationAttachment,
  error?: unknown
): string {
  const label = attachment.name || attachment.fileId;
  if (error instanceof AppError && error.error_code === "FILE_OWNER_MISMATCH") {
    return `Attachment blocked (uploaded by another account): ${label}`;
  }
  if (error instanceof AppError && error.error_code === "FILE_NOT_IN_ARCHIVE") {
    return `Attachment missing from the export archive: ${label}`;
  }
  return `Attachment unavailable: ${label}`;
}

/** Placeholder used when the caller disabled attachment downloads. */
export function formatAttachmentSkipped(attachment: ConversationAttachment): string {
  const label = attachment.name || attachment.fileId;
  return `Attachment skipped: ${label}`;
}
