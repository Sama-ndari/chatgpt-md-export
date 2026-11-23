import fs from "node:fs/promises";
import zlib from "node:zlib";
import { promisify } from "node:util";
import { AppError } from "../shared/errors.js";

const inflateRaw = promisify(zlib.inflateRaw);

const SIG_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const SIG_ZIP64_LOCATOR = 0x07064b50;
const SIG_ZIP64_END = 0x06064b50;
const SIG_CENTRAL_FILE = 0x02014b50;

const END_OF_CENTRAL_DIRECTORY_SIZE = 22;
const ZIP64_LOCATOR_SIZE = 20;
const CENTRAL_FILE_HEADER_SIZE = 46;
const LOCAL_FILE_HEADER_SIZE = 30;
const MAX_COMMENT_SIZE = 0xffff;
const UINT32_MAX = 0xffffffff;

const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

/** One file inside the zip, located but not yet decompressed. */
export interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

/** Random-access reader over a zip file. Call `close` when finished. */
export interface ZipArchive {
  filePath: string;
  entries: ZipEntry[];
  read(entry: ZipEntry): Promise<Buffer>;
  close(): Promise<void>;
}

interface CentralDirectoryLocation {
  offset: number;
  size: number;
  entryCount: number;
}

/**
 * Open a zip file and read its central directory. Supports stored and
 * deflated entries, and zip64 archives, which a large ChatGPT export can be.
 */
export async function openZipArchive(filePath: string): Promise<ZipArchive> {
  const handle = await fs.open(filePath, "r").catch((error: unknown) => {
    throw new AppError("ARCHIVE_NOT_FOUND", `Could not open ${filePath}: ${describe(error)}`);
  });

  try {
    const { size } = await handle.stat();
    const location = await locateCentralDirectory(handle, size, filePath);
    const entries = await readCentralDirectory(handle, location, filePath);
    return {
      filePath,
      entries,
      read: (entry) => readEntry(handle, entry, filePath),
      close: () => handle.close()
    };
  } catch (error) {
    await handle.close();
    throw error;
  }
}

async function readAt(handle: fs.FileHandle, offset: number, length: number): Promise<Buffer> {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await handle.read(buffer, 0, length, offset);
  return bytesRead === length ? buffer : buffer.subarray(0, bytesRead);
}

async function locateCentralDirectory(
  handle: fs.FileHandle,
  fileSize: number,
  filePath: string
): Promise<CentralDirectoryLocation> {
  const tailSize = Math.min(fileSize, END_OF_CENTRAL_DIRECTORY_SIZE + MAX_COMMENT_SIZE);
  const tail = await readAt(handle, fileSize - tailSize, tailSize);
  const endOffset = findSignature(tail, SIG_END_OF_CENTRAL_DIRECTORY);
  if (endOffset < 0) {
    throw new AppError("ARCHIVE_INVALID", `${filePath} is not a zip file.`);
  }

  const base: CentralDirectoryLocation = {
    entryCount: tail.readUInt16LE(endOffset + 10),
    size: tail.readUInt32LE(endOffset + 12),
    offset: tail.readUInt32LE(endOffset + 16)
  };
  return needsZip64(base)
    ? await readZip64Location(handle, tail, endOffset, filePath)
    : base;
}

function needsZip64(location: CentralDirectoryLocation): boolean {
  return (
    location.offset === UINT32_MAX ||
    location.size === UINT32_MAX ||
    location.entryCount === 0xffff
  );
}

async function readZip64Location(
  handle: fs.FileHandle,
  tail: Buffer,
  endOffset: number,
  filePath: string
): Promise<CentralDirectoryLocation> {
  const locatorOffset = endOffset - ZIP64_LOCATOR_SIZE;
  if (locatorOffset < 0 || tail.readUInt32LE(locatorOffset) !== SIG_ZIP64_LOCATOR) {
    throw new AppError("ARCHIVE_INVALID", `${filePath} is missing its zip64 locator.`);
  }

  const recordOffset = Number(tail.readBigUInt64LE(locatorOffset + 8));
  const record = await readAt(handle, recordOffset, 56);
  if (record.length < 56 || record.readUInt32LE(0) !== SIG_ZIP64_END) {
    throw new AppError("ARCHIVE_INVALID", `${filePath} has an unreadable zip64 directory.`);
  }

  return {
    entryCount: Number(record.readBigUInt64LE(32)),
    size: Number(record.readBigUInt64LE(40)),
    offset: Number(record.readBigUInt64LE(48))
  };
}

function findSignature(buffer: Buffer, signature: number): number {
  for (let offset = buffer.length - 4; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) return offset;
  }
  return -1;
}

async function readCentralDirectory(
  handle: fs.FileHandle,
  location: CentralDirectoryLocation,
  filePath: string
): Promise<ZipEntry[]> {
  const directory = await readAt(handle, location.offset, location.size);
  const entries: ZipEntry[] = [];
  let cursor = 0;

  while (cursor + CENTRAL_FILE_HEADER_SIZE <= directory.length) {
    if (directory.readUInt32LE(cursor) !== SIG_CENTRAL_FILE) break;
    const nameLength = directory.readUInt16LE(cursor + 28);
    const extraLength = directory.readUInt16LE(cursor + 30);
    const commentLength = directory.readUInt16LE(cursor + 32);
    const nameEnd = cursor + CENTRAL_FILE_HEADER_SIZE + nameLength;

    entries.push(
      withZip64Fields(
        {
          name: directory.toString("utf8", cursor + CENTRAL_FILE_HEADER_SIZE, nameEnd),
          compressionMethod: directory.readUInt16LE(cursor + 10),
          compressedSize: directory.readUInt32LE(cursor + 20),
          uncompressedSize: directory.readUInt32LE(cursor + 24),
          localHeaderOffset: directory.readUInt32LE(cursor + 42)
        },
        directory.subarray(nameEnd, nameEnd + extraLength)
      )
    );
    cursor = nameEnd + extraLength + commentLength;
  }

  if (entries.length === 0) {
    throw new AppError("ARCHIVE_INVALID", `${filePath} contains no files.`);
  }
  return entries;
}

/**
 * Replace any 0xffffffff placeholder with the real 64 bit value, which lives
 * in the zip64 extended information extra field (header id 0x0001).
 */
function withZip64Fields(entry: ZipEntry, extra: Buffer): ZipEntry {
  const placeholders = [
    entry.uncompressedSize === UINT32_MAX,
    entry.compressedSize === UINT32_MAX,
    entry.localHeaderOffset === UINT32_MAX
  ];
  if (!placeholders.some(Boolean)) return entry;

  const payload = findExtraField(extra, 0x0001);
  if (!payload) return entry;

  const values: number[] = [];
  for (let offset = 0; offset + 8 <= payload.length; offset += 8) {
    values.push(Number(payload.readBigUInt64LE(offset)));
  }

  let index = 0;
  const next = (condition: boolean, fallback: number): number =>
    condition && index < values.length ? (values[index++] ?? fallback) : fallback;

  return {
    ...entry,
    uncompressedSize: next(placeholders[0] === true, entry.uncompressedSize),
    compressedSize: next(placeholders[1] === true, entry.compressedSize),
    localHeaderOffset: next(placeholders[2] === true, entry.localHeaderOffset)
  };
}

function findExtraField(extra: Buffer, headerId: number): Buffer | undefined {
  let cursor = 0;
  while (cursor + 4 <= extra.length) {
    const id = extra.readUInt16LE(cursor);
    const size = extra.readUInt16LE(cursor + 2);
    if (id === headerId) return extra.subarray(cursor + 4, cursor + 4 + size);
    cursor += 4 + size;
  }
  return undefined;
}

async function readEntry(
  handle: fs.FileHandle,
  entry: ZipEntry,
  filePath: string
): Promise<Buffer> {
  const header = await readAt(handle, entry.localHeaderOffset, LOCAL_FILE_HEADER_SIZE);
  if (header.length < LOCAL_FILE_HEADER_SIZE) {
    throw new AppError("ARCHIVE_INVALID", `${entry.name} has a truncated header in ${filePath}.`);
  }

  const dataOffset =
    entry.localHeaderOffset +
    LOCAL_FILE_HEADER_SIZE +
    header.readUInt16LE(26) +
    header.readUInt16LE(28);
  const raw = await readAt(handle, dataOffset, entry.compressedSize);

  if (entry.compressionMethod === METHOD_STORED) return raw;
  if (entry.compressionMethod !== METHOD_DEFLATE) {
    throw new AppError(
      "ARCHIVE_INVALID",
      `${entry.name} uses an unsupported zip compression method (${entry.compressionMethod}).`
    );
  }

  try {
    return await inflateRaw(raw);
  } catch (error) {
    throw new AppError(
      "ARCHIVE_INVALID",
      `Could not decompress ${entry.name} from ${filePath}: ${describe(error)}`
    );
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
