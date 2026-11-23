import { AppError } from "../shared/errors.js";
import type { ChatgptConversation } from "./types.js";

const UPDATE_HINT =
  "ChatGPT returned a conversation in a shape this version does not understand. " +
  "Its private API changed. Update the extension, or export without a token from " +
  "the official ChatGPT data export, which has a stable format.";

/**
 * Guard the one assumption link mode makes about ChatGPT's private API: the
 * payload carries a `mapping` of message nodes. Without this, a format change
 * surfaces much later as an empty export or an unrelated type error.
 */
export function assertConversationShape(
  payload: unknown,
  source: string
): asserts payload is ChatgptConversation {
  if (!payload || typeof payload !== "object") {
    throw new AppError("REMOTE_SCHEMA_CHANGED", `${UPDATE_HINT} (${source} returned no object.)`);
  }

  const mapping = (payload as Record<string, unknown>).mapping;
  if (!mapping || typeof mapping !== "object") {
    throw new AppError(
      "REMOTE_SCHEMA_CHANGED",
      `${UPDATE_HINT} (${source} returned no message mapping.)`
    );
  }

  if (Object.keys(mapping).length === 0) {
    throw new AppError(
      "REMOTE_SCHEMA_CHANGED",
      `${source} returned a conversation with no messages. It may have been deleted.`
    );
  }
}
