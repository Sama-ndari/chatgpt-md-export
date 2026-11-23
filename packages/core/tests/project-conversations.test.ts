import { describe, expect, it } from "vitest";
import { listProjectConversations } from "../src/chatgpt/project-conversations.js";
import { parseProjectId } from "../src/chatgpt/project-url.js";
import { AppError } from "../src/shared/errors.js";

const PROJECT = "g-p-6a89f8acb5cc81919fed6cdff2476610";

/** A token that is a decodable JWT and expires well in the future. */
function env(): NodeJS.ProcessEnv {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86_400 })
  ).toString("base64url");
  return { CHATGPT_BEARER_TOKEN: `header.${payload}.signature` };
}

function item(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "conv-1",
    title: "A chat",
    create_time: "2026-09-11T10:31:08Z",
    update_time: "2026-11-01T19:08:37Z",
    is_archived: false,
    mapping: {},
    ...overrides
  };
}

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("parseProjectId", () => {
  it("accepts the landing page, a conversation inside it, and the bare id", () => {
    expect(parseProjectId(`https://chatgpt.com/g/${PROJECT}/project`)).toBe(PROJECT);
    expect(parseProjectId(`https://chatgpt.com/g/${PROJECT}/c/abc-123`)).toBe(PROJECT);
    expect(parseProjectId(`  ${PROJECT}  `)).toBe(PROJECT);
  });

  it("rejects anything without a project id", () => {
    expect(() => parseProjectId("https://chatgpt.com/c/abc-123")).toThrow(AppError);
    expect(() => parseProjectId("")).toThrow(AppError);
  });
});

describe("listProjectConversations", () => {
  it("follows the cursor and asks for 50 at a time", async () => {
    const urls: string[] = [];
    const fetchImpl = ((url: string) => {
      urls.push(url);
      return Promise.resolve(
        urls.length === 1
          ? respond({ items: [item({ id: "a" }), item({ id: "b" })], cursor: "NEXT" })
          : respond({ items: [item({ id: "c" })], cursor: null })
      );
    }) as unknown as typeof fetch;

    const list = await listProjectConversations({ projectId: PROJECT, env: env(), fetchImpl });

    expect(list.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
    expect(urls[0]).toContain("limit=50");
    expect(urls[0]).not.toContain("cursor=");
    expect(urls[1]).toContain("cursor=NEXT");
    expect(list[0]?.url).toBe(`https://chatgpt.com/g/${PROJECT}/c/a`);
  });

  it("marks a forked conversation as a branch", async () => {
    const fetchImpl = (() =>
      Promise.resolve(
        respond({
          items: [item({ id: "a", title: "Branch · CESAR : BLOC 1" }), item({ id: "b" })],
          cursor: null
        })
      )) as unknown as typeof fetch;

    const list = await listProjectConversations({ projectId: PROJECT, env: env(), fetchImpl });
    expect(list.map((entry) => entry.branch)).toEqual([true, false]);
  });

  it("drops archived conversations unless asked for them", async () => {
    const page = {
      items: [item({ id: "a" }), item({ id: "b", is_archived: true })],
      cursor: null
    };
    const fetchImpl = (() => Promise.resolve(respond(page))) as unknown as typeof fetch;

    const withoutArchived = await listProjectConversations({
      projectId: PROJECT,
      env: env(),
      fetchImpl
    });
    expect(withoutArchived.map((entry) => entry.id)).toEqual(["a"]);

    const withArchived = await listProjectConversations({
      projectId: PROJECT,
      env: env(),
      fetchImpl,
      includeArchived: true
    });
    expect(withArchived.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("blames the token on 401 rather than the project", async () => {
    const fetchImpl = (() =>
      Promise.resolve(respond({ detail: "nope" }, 401))) as unknown as typeof fetch;

    await expect(
      listProjectConversations({ projectId: PROJECT, env: env(), fetchImpl })
    ).rejects.toMatchObject({ error_code: "AUTH_FAILED" });
  });

  it("says the format changed when no item list comes back", async () => {
    const fetchImpl = (() =>
      Promise.resolve(respond({ conversations: [] }))) as unknown as typeof fetch;

    await expect(
      listProjectConversations({ projectId: PROJECT, env: env(), fetchImpl })
    ).rejects.toMatchObject({ error_code: "REMOTE_SCHEMA_CHANGED" });
  });
});
