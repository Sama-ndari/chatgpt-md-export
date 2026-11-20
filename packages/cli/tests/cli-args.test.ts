import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli-args.js";

describe("parseArgs", () => {
  it("reads a URL with its options", () => {
    const args = parseArgs(["https://chatgpt.com/c/abc", "-o", "./out", "-a", "Sam", "--skip-files"]);
    expect(args).toEqual({
      url: "https://chatgpt.com/c/abc",
      outDir: "./out",
      author: "Sam",
      listOnly: false,
      skipFiles: true
    });
  });

  it("reads archive mode with a conversation id", () => {
    const args = parseArgs(["--archive", "/tmp/export", "--conversation", "conv-1"]);
    expect(args.archivePath).toBe("/tmp/export");
    expect(args.conversationId).toBe("conv-1");
    expect(args.url).toBeUndefined();
  });

  it("rejects mixing a URL with --archive", () => {
    expect(() => parseArgs(["https://chatgpt.com/c/abc", "--archive", "/tmp/export"])).toThrow(
      /either a ChatGPT URL or --archive/
    );
  });

  it("rejects --list without an archive", () => {
    expect(() => parseArgs(["https://chatgpt.com/c/abc", "--list"])).toThrow(/--list only applies/);
  });

  it("rejects a value flag with no value", () => {
    expect(() => parseArgs(["--archive", "--skip-files"])).toThrow(/requires a value/);
  });

  it("rejects unknown options and stray arguments", () => {
    expect(() => parseArgs(["--nope"])).toThrow(/Unknown option/);
    expect(() => parseArgs(["one", "two"])).toThrow(/Unexpected argument/);
  });

  it("requires a source", () => {
    expect(() => parseArgs([])).toThrow(/Missing ChatGPT URL or --archive/);
  });
});
