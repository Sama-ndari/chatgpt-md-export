import { describe, expect, it } from "vitest";
import { ExportHistory, type ExportRecord } from "../src/exports-history.js";
import { StubMemento } from "./vscode-stub.js";

function record(overrides: Partial<ExportRecord> = {}): ExportRecord {
  return {
    outputDir: "/out/chat-1",
    htmlPath: "/out/chat-1/chat.html",
    markdownPath: "/out/chat-1/chat.md",
    title: "Chat 1",
    messageCount: 12,
    exportedAt: "2026-11-23T10:00:00.000Z",
    ...overrides
  };
}

describe("ExportHistory", () => {
  it("starts empty", () => {
    const history = new ExportHistory(new StubMemento());
    expect(history.list()).toEqual([]);
    expect(history.latest()).toBeUndefined();
  });

  it("puts the newest export first", async () => {
    const history = new ExportHistory(new StubMemento());
    await history.add(record({ outputDir: "/out/a", title: "A" }));
    await history.add(record({ outputDir: "/out/b", title: "B" }));
    expect(history.list().map((entry) => entry.title)).toEqual(["B", "A"]);
    expect(history.latest()?.title).toBe("B");
  });

  it("replaces an earlier export written to the same folder", async () => {
    const history = new ExportHistory(new StubMemento());
    await history.add(record({ title: "First", messageCount: 2 }));
    await history.add(record({ title: "Re-exported", messageCount: 9 }));
    expect(history.list()).toHaveLength(1);
    expect(history.list()[0]?.messageCount).toBe(9);
  });

  it("keeps at most fifteen entries", async () => {
    const history = new ExportHistory(new StubMemento());
    for (let index = 0; index < 20; index += 1) {
      await history.add(record({ outputDir: `/out/chat-${index}`, title: `Chat ${index}` }));
    }
    expect(history.list()).toHaveLength(15);
    expect(history.list()[0]?.title).toBe("Chat 19");
    expect(history.list().at(-1)?.title).toBe("Chat 5");
  });

  it("removes one entry and clears the rest", async () => {
    const history = new ExportHistory(new StubMemento());
    await history.add(record({ outputDir: "/out/a" }));
    await history.add(record({ outputDir: "/out/b" }));
    await history.remove("/out/a");
    expect(history.list().map((entry) => entry.outputDir)).toEqual(["/out/b"]);
    await history.clear();
    expect(history.list()).toEqual([]);
  });
});
