import { describe, expect, it } from "vitest";
import { renderConversationMarkdown } from "../src/export/render-markdown.js";

describe("renderConversationMarkdown", () => {
  it("renders title, author, dialogue and relative file links", () => {
    const relativePaths = new Map([["file-service:file-1", "files/photo.png"]]);
    const md = renderConversationMarkdown({
      header: {
        title: "Demo chat",
        author: "Sam",
        sourceUrl: "https://chatgpt.com/c/abc",
        exportedAt: "2026-11-01T00:00:00.000Z"
      },
      messages: [
        {
          role: "user",
          parts: [
            { type: "text", text: "Voici une image" },
            {
              type: "attachment",
              attachment: {
                key: "file-service:file-1",
                fileId: "file-1",
                kind: "file-service",
                name: "photo.png",
                isImage: true
              }
            }
          ]
        },
        {
          role: "assistant",
          parts: [{ type: "text", text: "Bien reçu." }]
        }
      ],
      relativePaths
    });

    expect(md).toContain("# Demo chat");
    expect(md).toContain("**Author:** Sam");
    expect(md).toContain("## Author");
    expect(md).toContain("## Assistant");
    expect(md).toContain("![photo.png](files/photo.png)");
    expect(md).toContain("Bien reçu.");
    expect(md).not.toContain("<details>");
  });
});
