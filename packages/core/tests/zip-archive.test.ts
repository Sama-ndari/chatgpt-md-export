import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { readExportArchive, closeExportArchive } from "../src/archive/read-archive.js";
import { exportConversationFromArchive } from "../src/export/export-from-archive.js";
import { openZipArchive } from "../src/archive/zip-reader.js";
import { AppError } from "../src/shared/errors.js";

interface ZipInput {
  name: string;
  contents: Buffer;
  /** Store the bytes uncompressed, which a real zip also does for small files. */
  stored?: boolean;
}

const created: string[] = [];

afterEach(async () => {
  await Promise.all(created.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function tempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "zip-archive-test-"));
  created.push(dir);
  return dir;
}

/** Build a real zip file, so the reader is exercised against actual bytes. */
async function writeZip(filePath: string, files: ZipInput[]): Promise<string> {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const method = file.stored ? 0 : 8;
    const body = file.stored ? file.contents : zlib.deflateRawSync(file.contents);
    const crc = crc32(file.contents);

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(file.contents.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    locals.push(local, body);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(file.contents.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);

    offset += local.length + body.length;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  await fs.writeFile(filePath, Buffer.concat([...locals, directory, end]));
  return filePath;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function conversationsJson(): Buffer {
  return Buffer.from(
    JSON.stringify([
      {
        id: "conv-1",
        conversation_id: "conv-1",
        title: "Zipped chat",
        create_time: 1700000000,
        update_time: 1700000100,
        mapping: {
          root: { id: "root", message: null, parent: null, children: ["m1"] },
          m1: {
            id: "m1",
            parent: "root",
            children: [],
            message: {
              id: "m1",
              author: { role: "user" },
              create_time: 1700000000,
              content: { content_type: "text", parts: ["Hello from the zip"] }
            }
          }
        }
      }
    ]),
    "utf8"
  );
}

describe("openZipArchive", () => {
  it("reads deflated and stored entries", async () => {
    const dir = await tempDir();
    const zipPath = await writeZip(path.join(dir, "sample.zip"), [
      { name: "deflated.txt", contents: Buffer.from("x".repeat(2000), "utf8") },
      { name: "stored.txt", contents: Buffer.from("tiny", "utf8"), stored: true }
    ]);

    const zip = await openZipArchive(zipPath);
    try {
      const byName = new Map(zip.entries.map((entry) => [entry.name, entry]));
      expect([...byName.keys()].sort()).toEqual(["deflated.txt", "stored.txt"]);
      expect((await zip.read(byName.get("deflated.txt")!)).toString()).toBe("x".repeat(2000));
      expect((await zip.read(byName.get("stored.txt")!)).toString()).toBe("tiny");
    } finally {
      await zip.close();
    }
  });

  it("rejects a file that is not a zip", async () => {
    const dir = await tempDir();
    const notZip = path.join(dir, "not.zip");
    await fs.writeFile(notZip, "definitely not a zip archive");
    await expect(openZipArchive(notZip)).rejects.toThrow(AppError);
  });
});

describe("readExportArchive on a .zip", () => {
  it("finds conversations.json nested in a folder", async () => {
    const dir = await tempDir();
    const zipPath = await writeZip(path.join(dir, "export.zip"), [
      { name: "chatgpt-export/conversations.json", contents: conversationsJson() },
      { name: "chatgpt-export/file-abc123-diagram.png", contents: Buffer.from("png-bytes") }
    ]);

    const archive = await readExportArchive(zipPath);
    try {
      expect(archive.conversations).toHaveLength(1);
      expect(archive.conversations[0]?.title).toBe("Zipped chat");
      expect(archive.zip).toBeDefined();
    } finally {
      await closeExportArchive(archive);
    }
  });

  it("explains itself when the zip is not a ChatGPT export", async () => {
    const dir = await tempDir();
    const zipPath = await writeZip(path.join(dir, "other.zip"), [
      { name: "readme.txt", contents: Buffer.from("nothing to see") }
    ]);

    await expect(readExportArchive(zipPath)).rejects.toThrow(/conversations\.json/);
  });

  it("exports a conversation straight out of the zip", async () => {
    const dir = await tempDir();
    const outRoot = path.join(dir, "out");
    const zipPath = await writeZip(path.join(dir, "export.zip"), [
      { name: "conversations.json", contents: conversationsJson() }
    ]);

    const archive = await readExportArchive(zipPath);
    try {
      const result = await exportConversationFromArchive({ archive, outRoot });
      expect(result.title).toBe("Zipped chat");
      await expect(fs.readFile(result.markdownPath, "utf8")).resolves.toContain(
        "Hello from the zip"
      );
    } finally {
      await closeExportArchive(archive);
    }
  });
});
