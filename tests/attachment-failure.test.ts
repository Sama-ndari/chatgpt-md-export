import { describe, expect, it } from "vitest";
import {
  formatAttachmentFailure,
  formatAttachmentSkipped
} from "../src/export/attachment-failure.js";
import { AppError } from "../src/shared/errors.js";

const attachment = {
  key: "file-service:file-1",
  fileId: "file-1",
  kind: "file-service" as const,
  name: "spec.docx",
  isImage: false
};

describe("formatAttachmentFailure", () => {
  it("explains owner mismatch clearly", () => {
    const note = formatAttachmentFailure(
      attachment,
      new AppError("FILE_OWNER_MISMATCH", "user_mismatch")
    );
    expect(note).toBe("Attachment blocked (uploaded by another account): spec.docx");
  });

  it("falls back for generic download failures", () => {
    const note = formatAttachmentFailure(
      attachment,
      new AppError("FILE_DOWNLOAD_FAILED", "boom")
    );
    expect(note).toBe("Attachment unavailable: spec.docx");
  });
});

describe("formatAttachmentSkipped", () => {
  it("mentions --skip-files", () => {
    expect(formatAttachmentSkipped(attachment)).toBe(
      "Attachment skipped (--skip-files): spec.docx"
    );
  });
});
