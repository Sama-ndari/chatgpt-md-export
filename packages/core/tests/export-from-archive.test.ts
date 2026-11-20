import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { exportConversationFromArchive } from "../src/export/export-from-archive.js";
import { readExportArchive, summarizeArchive } from "../src/archive/read-archive.js";
import { AppError } from "../src/shared/errors.js";

function conversation(input: {
  id: string;
  title: string;
  updateTime: number;
  assetPointer?: string;
}) {
  const parts: unknown[] = ["see image"];
  if (input.assetPointer) {
    parts.push({ content_type: "image_asset_pointer", asset_pointer: input.assetPointer });
  }
  return {
    conversation_id: input.id,
    title: input.title,
    create_time: 1700000000,
    update_time: input.updateTime,
    default_model_slug: "gpt-4o",
    current_node: "m1",
    mapping: {
      root: { id: "root", parent: null, children: ["m1"], message: null },
      m1: {
        id: "m1",
        parent: "root",
        children: [],
        message: {
          id: "m1",
          author: { role: "user" },
          content: { content_type: "multimodal_text", parts }
        }
      }
    }
  };
}

async function writeArchive(): Promise<{ archiveDir: string; outRoot: string; tempDir: string }> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chatgpt-md-archive-"));
  const archiveDir = path.join(tempDir, "archive");
  const outRoot = path.join(tempDir, "out");
  await fs.mkdir(path.join(archiveDir, "dalle-generations"), { recursive: true });
  await fs.writeFile(
    path.join(archiveDir, "conversations.json"),
    JSON.stringify([
      conversation({ id: "conv-old", title: "Older chat", updateTime: 1700000001 }),
      conversation({
        id: "conv-new",
        title: "Newer chat",
        updateTime: 1700009999,
        assetPointer: "file-service://file-abc123"
      })
    ]),
    "utf8"
  );
  await fs.writeFile(
    path.join(archiveDir, "dalle-generations", "file-abc123-render.png"),
    Buffer.from("PNGDATA")
  );
  return { archiveDir, outRoot, tempDir };
}

describe("export from an official ChatGPT archive", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("lists conversations newest first and reads default_model_slug", async () => {
    const fixture = await writeArchive();
    tempDir = fixture.tempDir;
    const archive = await readExportArchive(fixture.archiveDir);

    expect(summarizeArchive(archive).map((item) => item.id)).toEqual(["conv-new", "conv-old"]);
    expect(archive.conversations[0].model).toBe("gpt-4o");
  });

  it("exports the newest conversation and copies its attachment", async () => {
    const fixture = await writeArchive();
    tempDir = fixture.tempDir;
    const result = await exportConversationFromArchive({
      archive: await readExportArchive(fixture.archiveDir),
      outRoot: fixture.outRoot,
      author: "Sam"
    });

    const markdown = await fs.readFile(result.markdownPath, "utf8");
    expect(result.title).toBe("Newer chat");
    expect(result.downloadedFiles).toBe(1);
    expect(markdown).toContain("![file-abc123-render.png](files/file-abc123-render.png)");
    await expect(
      fs.readFile(path.join(result.filesDir, "file-abc123-render.png"))
    ).resolves.toEqual(Buffer.from("PNGDATA"));
  });

  it("reports a missing attachment instead of aborting the export", async () => {
    const fixture = await writeArchive();
    tempDir = fixture.tempDir;
    await fs.rm(path.join(fixture.archiveDir, "dalle-generations"), { recursive: true });
    const result = await exportConversationFromArchive({
      archive: await readExportArchive(fixture.archiveDir),
      conversationId: "conv-new",
      outRoot: fixture.outRoot
    });

    const markdown = await fs.readFile(result.markdownPath, "utf8");
    expect(result.failedFiles).toBe(1);
    expect(markdown).toContain("Attachment missing from the export archive");
  });

  it("rejects a zip path with an actionable error", async () => {
    const fixture = await writeArchive();
    tempDir = fixture.tempDir;
    const zipPath = path.join(fixture.archiveDir, "export.zip");
    await fs.writeFile(zipPath, "not really a zip", "utf8");

    await expect(readExportArchive(zipPath)).rejects.toMatchObject({
      error_code: "ARCHIVE_NOT_FOUND"
    });
    await expect(readExportArchive(zipPath)).rejects.toBeInstanceOf(AppError);
  });
});
