import { describe, expect, it } from "vitest";
import { assertConversationShape } from "../src/chatgpt/conversation-schema.js";
import { AppError } from "../src/shared/errors.js";

describe("assertConversationShape", () => {
  it("accepts a payload that carries a message mapping", () => {
    expect(() =>
      assertConversationShape({ mapping: { root: { id: "root" } } }, "conversation x")
    ).not.toThrow();
  });

  it("names the private API as the cause when the mapping disappears", () => {
    try {
      assertConversationShape({ messages: [] }, "conversation x");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).error_code).toBe("REMOTE_SCHEMA_CHANGED");
      expect((error as AppError).message).toMatch(/private API changed/);
      expect((error as AppError).message).toMatch(/data export/);
    }
  });

  it("rejects a non-object payload", () => {
    expect(() => assertConversationShape("<html>login</html>", "conversation x")).toThrow(AppError);
    expect(() => assertConversationShape(null, "conversation x")).toThrow(AppError);
  });

  it("treats an empty mapping as a deleted conversation, not a format change", () => {
    try {
      assertConversationShape({ mapping: {} }, "conversation x");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as AppError).message).toMatch(/no messages/);
    }
  });
});
