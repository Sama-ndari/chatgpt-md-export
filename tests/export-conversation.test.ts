import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { exportConversation } from "../src/export/export-conversation.js";

const token =
  "header." +
  Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
      "https://api.openai.com/auth": { chatgpt_plan_type: "plus" }
    })
  ).toString("base64url") +
  ".sig";

describe("exportConversation", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("soft-fails owner-mismatch file downloads and still writes markdown", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chatgpt-md-export-"));
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/backend-api/conversation/conv-owner")) {
        return new Response(
          JSON.stringify({
            title: "Shared specs",
            create_time: 1700000000,
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
                  content: { content_type: "text", parts: ["see attachment"] },
                  metadata: {
                    attachments: [
                      {
                        id: "file-boss",
                        name: "cdc.pdf",
                        mime_type: "application/pdf"
                      }
                    ]
                  }
                }
              }
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (url.includes("/files/") || url.includes("/attachment/")) {
        return new Response(JSON.stringify({ detail: "user_mismatch" }), {
          status: 403,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response("not found", { status: 404 });
    };

    const result = await exportConversation({
      url: "https://chatgpt.com/c/conv-owner",
      outDir: tempDir,
      author: "Sam",
      env: { CHATGPT_BEARER_TOKEN: token },
      clientOptions: { env: { CHATGPT_BEARER_TOKEN: token }, fetchImpl }
    });

    const markdown = await fs.readFile(result.markdownPath, "utf8");
    expect(result.downloadedFiles).toBe(0);
    expect(result.failedFiles).toBe(1);
    expect(markdown).toContain(
      "Attachment blocked (uploaded by another account): cdc.pdf"
    );
    expect(markdown).toContain("see attachment");
  });

  it("writes markdown with relative attachment links", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "chatgpt-md-export-"));
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/backend-api/conversation/conv-1")) {
        return new Response(
          JSON.stringify({
            title: "Hello World",
            create_time: 1700000000,
            current_node: "m2",
            mapping: {
              root: { id: "root", parent: null, children: ["m1"], message: null },
              m1: {
                id: "m1",
                parent: "root",
                children: ["m2"],
                message: {
                  id: "m1",
                  author: { role: "user" },
                  content: {
                    content_type: "multimodal_text",
                    parts: [
                      "see image",
                      {
                        content_type: "image_asset_pointer",
                        asset_pointer: "file-service://file-abc"
                      }
                    ]
                  }
                }
              },
              m2: {
                id: "m2",
                parent: "m1",
                children: [],
                message: {
                  id: "m2",
                  author: { role: "assistant" },
                  content: { content_type: "text", parts: ["ok"] }
                }
              }
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (url.includes("/files/download/file-abc") || url.includes("/files/file-abc/download")) {
        return new Response(
          JSON.stringify({
            status: "success",
            download_url: "https://cdn.example/file-abc",
            file_name: "photo.png",
            mime_type: "image/png"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (url === "https://cdn.example/file-abc") {
        return new Response(Buffer.from("PNGDATA"), {
          status: 200,
          headers: { "content-type": "image/png" }
        });
      }
      return new Response("not found", { status: 404 });
    };

    const result = await exportConversation({
      url: "https://chatgpt.com/c/conv-1",
      outDir: tempDir,
      author: "Sam",
      env: { CHATGPT_BEARER_TOKEN: token },
      clientOptions: { env: { CHATGPT_BEARER_TOKEN: token }, fetchImpl }
    });

    const markdown = await fs.readFile(result.markdownPath, "utf8");
    const html = await fs.readFile(result.htmlPath, "utf8");
    expect(markdown).toContain("# Hello World");
    expect(markdown).toContain("**Author:** Sam");
    expect(markdown).toContain("![photo.png](files/photo.png)");
    expect(html).toContain("message-body");
    expect(html).toContain("photo.png");
    expect(result.downloadedFiles).toBe(1);
    await expect(fs.readFile(path.join(result.filesDir, "photo.png"))).resolves.toEqual(
      Buffer.from("PNGDATA")
    );
  });
});
