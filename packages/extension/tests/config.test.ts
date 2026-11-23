import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildCoreEnv, describeOutputRoot, readConfig, resolveOutputRoot } from "../src/config.js";
import { configureStub, resetStub } from "./vscode-stub.js";

afterEach(() => {
  resetStub();
});

describe("readConfig", () => {
  it("falls back to chatgpt-exports when the setting is blank", () => {
    configureStub({ settings: { "chatgptMdExport.outputDirectory": "   " } });
    expect(readConfig().outputDirectory).toBe("chatgpt-exports");
  });

  it("keeps attachments on and the preview open by default", () => {
    configureStub({});
    const config = readConfig();
    expect(config.downloadAttachments).toBe(true);
    expect(config.openAfterExport).toBe("preview");
    expect(config.authorName).toBeUndefined();
  });

  it("trims the values the user typed", () => {
    configureStub({
      settings: {
        "chatgptMdExport.outputDirectory": " notes ",
        "chatgptMdExport.authorName": "  Sam  ",
        "chatgptMdExport.downloadAttachments": false
      }
    });
    const config = readConfig();
    expect(config.outputDirectory).toBe("notes");
    expect(config.authorName).toBe("Sam");
    expect(config.downloadAttachments).toBe(false);
  });
});

describe("resolveOutputRoot", () => {
  it("resolves a relative directory against the first workspace folder", () => {
    configureStub({ workspaceFolders: [path.join(path.sep, "work", "repo")] });
    const root = resolveOutputRoot({ ...base, outputDirectory: "chatgpt-exports" });
    expect(root).toBe(path.join(path.sep, "work", "repo", "chatgpt-exports"));
  });

  it("uses an absolute setting as given", () => {
    configureStub({ workspaceFolders: [path.join(path.sep, "work", "repo")] });
    const absolute = path.join(path.sep, "elsewhere", "out");
    expect(resolveOutputRoot({ ...base, outputDirectory: absolute })).toBe(absolute);
  });

  it("falls back to the temp directory with no workspace open", () => {
    configureStub({});
    expect(resolveOutputRoot({ ...base, outputDirectory: "chatgpt-exports" })).toBe(
      path.join(os.tmpdir(), "chatgpt-md-export")
    );
  });
});

describe("describeOutputRoot", () => {
  it("phrases a folder inside the workspace relatively", () => {
    configureStub({ workspaceFolders: [path.join(path.sep, "work", "repo")] });
    expect(describeOutputRoot({ ...base, outputDirectory: "chatgpt-exports" })).toBe(
      `chatgpt-exports${path.sep}`
    );
  });

  it("keeps a folder outside the workspace absolute", () => {
    configureStub({ workspaceFolders: [path.join(path.sep, "work", "repo")] });
    const absolute = path.join(path.sep, "elsewhere", "out");
    expect(describeOutputRoot({ ...base, outputDirectory: absolute })).toBe(absolute);
  });
});

describe("buildCoreEnv", () => {
  it("passes only what is set, and never an empty token", () => {
    expect(buildCoreEnv(undefined, base)).toEqual({});
    expect(buildCoreEnv("abc", { ...base, accountId: "acc", authorName: "Sam" })).toEqual({
      CHATGPT_BEARER_TOKEN: "abc",
      CHATGPT_ACCOUNT_ID: "acc",
      CHATGPT_AUTHOR_NAME: "Sam"
    });
  });
});

const base = {
  outputDirectory: "chatgpt-exports",
  downloadAttachments: true,
  openAfterExport: "preview"
} as const;
