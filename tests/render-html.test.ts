import { describe, expect, it } from "vitest";
import { renderConversationHtml } from "../src/export/render-html.js";

describe("renderConversationHtml", () => {
  it("renders chat cards with collapsible bodies", () => {
    const html = renderConversationHtml({
      header: {
        title: "Demo chat",
        author: "Sam",
        sourceUrl: "https://chatgpt.com/c/abc",
        exportedAt: "2026-11-01T00:00:00.000Z"
      },
      messages: [
        { role: "user", parts: [{ type: "text", text: "Hello <world>" }] },
        { role: "assistant", parts: [{ type: "text", text: "Hi there" }] }
      ],
      relativePaths: new Map()
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain(">Author</span>");
    expect(html).toContain(">Assistant</span>");
    expect(html).toContain('class="message-body"');
    expect(html).toContain("Hello &lt;world&gt;");
    expect(html).toContain("Expand all");
    expect(html).toContain("Collapse all");
    expect(html).toContain("Fraunces");
    expect(html).toContain("export-credit");
    expect(html).toContain("Exported with chatgpt-md-export · built by Samandari");
  });
});
