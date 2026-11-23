import { AppError } from "../shared/errors.js";
import { createApiHeaders, getTokenInfo } from "./auth.js";
import type { ChatgptClientOptions } from "./chatgpt-client.js";

const API_BASE = "https://chatgpt.com/backend-api";

/** The listing endpoint rejects anything above 50 with HTTP 422. */
const PAGE_SIZE = 50;
const MAX_PAGES = 100;

export interface ProjectConversationSummary {
  id: string;
  title: string;
  createTime?: number | string | null;
  updateTime?: number | string | null;
  archived: boolean;
  /**
   * ChatGPT labels a forked conversation by prefixing its title, and exposes
   * no field that marks one, so this is a heuristic on the title. It decides
   * what is preselected, never what is reachable.
   */
  branch: boolean;
  url: string;
}

export interface ListProjectConversationsInput extends ChatgptClientOptions {
  projectId: string;
  /** Leave false to skip conversations the user archived in ChatGPT. */
  includeArchived?: boolean;
}

interface ListingPage {
  items?: unknown[];
  cursor?: string | null;
}

/**
 * List the conversations of one ChatGPT project, following the cursor until
 * the end. The payload carries metadata only: its `mapping` is always empty,
 * so each conversation still has to be fetched to be exported.
 */
export async function listProjectConversations(
  input: ListProjectConversationsInput
): Promise<ProjectConversationSummary[]> {
  const env = input.env ?? process.env;
  const fetchImpl = input.fetchImpl ?? fetch;
  const tokenInfo = getTokenInfo(env);
  const headers = {
    ...createApiHeaders(tokenInfo.token, tokenInfo.account_id, { projectId: input.projectId }),
    Referer: `https://chatgpt.com/g/${input.projectId}/project`
  };

  const summaries: ProjectConversationSummary[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const body = await fetchPage({ projectId: input.projectId, cursor, headers, fetchImpl });
    const items = Array.isArray(body.items) ? body.items : [];
    for (const item of items) {
      const summary = toSummary(item, input.projectId);
      if (summary && (input.includeArchived || !summary.archived)) summaries.push(summary);
    }

    cursor = body.cursor ?? undefined;
    if (!cursor || items.length === 0) break;
  }

  return summaries;
}

async function fetchPage(input: {
  projectId: string;
  cursor: string | undefined;
  headers: Record<string, string>;
  fetchImpl: typeof fetch;
}): Promise<ListingPage> {
  const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (input.cursor) query.set("cursor", input.cursor);
  const url = `${API_BASE}/gizmos/${encodeURIComponent(input.projectId)}/conversations?${query.toString()}`;
  const response = await input.fetchImpl(url, { headers: input.headers });

  if (response.status === 401 || response.status === 403) {
    throw new AppError(
      "AUTH_FAILED",
      `ChatGPT rejected the project listing (${response.status}). The token may have expired, or the project belongs to another workspace.`
    );
  }
  if (response.status === 404) {
    throw new AppError(
      "CONVERSATION_NOT_FOUND_OR_FORBIDDEN",
      `Project ${input.projectId} was not found or is not accessible with the current token.`
    );
  }
  if (!response.ok) {
    throw new AppError(
      "REMOTE_REQUEST_FAILED",
      `ChatGPT project listing failed (${response.status} ${response.statusText}).`
    );
  }

  const body = (await response.json()) as ListingPage | null;
  if (!body || typeof body !== "object" || !Array.isArray(body.items)) {
    throw new AppError(
      "REMOTE_SCHEMA_CHANGED",
      "ChatGPT returned a project listing without an item list. Its private API changed; update the extension, or use the official data export."
    );
  }
  return body;
}

function toSummary(item: unknown, projectId: string): ProjectConversationSummary | undefined {
  if (!item || typeof item !== "object") return undefined;
  const entry = item as Record<string, unknown>;
  const id = typeof entry.id === "string" ? entry.id : undefined;
  if (!id) return undefined;

  const title = (typeof entry.title === "string" && entry.title.trim()) || "Untitled";
  return {
    id,
    title,
    createTime: asTime(entry.create_time),
    updateTime: asTime(entry.update_time),
    archived: entry.is_archived === true,
    branch: /^branch\s*[·.-]/i.test(title),
    url: `https://chatgpt.com/g/${projectId}/c/${id}`
  };
}

function asTime(value: unknown): number | string | null {
  if (typeof value === "number" || typeof value === "string") return value;
  return null;
}
