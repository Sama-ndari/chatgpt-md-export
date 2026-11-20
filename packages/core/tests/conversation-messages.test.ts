import { describe, expect, it } from "vitest";
import type { ChatgptConversation } from "../src/chatgpt/types.js";
import {
  collectAttachments,
  conversationToExportMessages,
  parseAssetPointer
} from "../src/export/conversation-messages.js";

describe("conversationToExportMessages", () => {
  it("follows current_node branch and extracts attachments", () => {
    const conversation: ChatgptConversation = {
      title: "Test",
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
                "hello",
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
            content: { content_type: "text", parts: ["hi"] }
          }
        }
      }
    };

    const messages = conversationToExportMessages(conversation);
    expect(messages).toHaveLength(2);
    expect(messages[0].parts[0]).toEqual({ type: "text", text: "hello" });
    expect(messages[0].parts[1].type).toBe("attachment");
    expect(collectAttachments(messages)).toHaveLength(1);
  });
});

describe("parseAssetPointer", () => {
  it("parses file-service and sediment pointers", () => {
    expect(parseAssetPointer("file-service://file-1")).toEqual({
      kind: "file-service",
      fileId: "file-1"
    });
    expect(parseAssetPointer("sediment://file_xyz")).toEqual({
      kind: "sediment",
      fileId: "file_xyz"
    });
  });
});
