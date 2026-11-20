import { describe, expect, it } from "vitest";
import { extractProjectId, parseChatgptUrl } from "../src/chatgpt/url-parser.js";

describe("parseChatgptUrl", () => {
  it("parses private conversation urls", () => {
    const parsed = parseChatgptUrl("https://chatgpt.com/c/abc-123");
    expect(parsed).toEqual({
      kind: "private",
      id: "abc-123",
      cacheId: "abc-123",
      sourceUrl: "https://chatgpt.com/c/abc-123"
    });
  });

  it("parses share urls including /share/e/", () => {
    expect(parseChatgptUrl("https://chatgpt.com/share/e/share-xyz").cacheId).toBe("share-share-xyz");
  });

  it("parses project conversation urls", () => {
    const slug = "g-p-0123456789abcdef0123456789abcdef-my-project";
    const parsed = parseChatgptUrl(`https://chatgpt.com/g/${slug}/c/conv-1`);
    expect(parsed.kind).toBe("project");
    expect(parsed.projectId).toBe("g-p-0123456789abcdef0123456789abcdef");
    expect(parsed.id).toBe("conv-1");
  });

  it("requires owner_user_id for shared project urls", () => {
    const slug = "g-p-0123456789abcdef0123456789abcdef";
    expect(() => parseChatgptUrl(`https://chatgpt.com/g/${slug}/shared/c/conv-1`)).toThrow(
      /owner_user_id/
    );
  });
});

describe("extractProjectId", () => {
  it("extracts compact project ids", () => {
    expect(extractProjectId("g-p-0123456789abcdef0123456789abcdef-title")).toBe(
      "g-p-0123456789abcdef0123456789abcdef"
    );
  });
});
