import { describe, expect, it } from "vitest";
import { describeToken } from "../src/token-status.js";

const NOW = Date.parse("2026-11-23T12:00:00Z");

function jwt(expSeconds: number | undefined): string {
  const payload = Buffer.from(JSON.stringify(expSeconds ? { exp: expSeconds } : {})).toString(
    "base64url"
  );
  return `header.${payload}.signature`;
}

describe("describeToken", () => {
  it("reports a missing token", () => {
    const status = describeToken(undefined, NOW);
    expect(status.kind).toBe("missing");
    expect(status.label).toMatch(/No token/);
  });

  it("counts the days left on a valid token", () => {
    const status = describeToken(jwt(NOW / 1000 + 6 * 86400), NOW);
    expect(status.kind).toBe("valid");
    expect(status.label).toContain("6");
  });

  it("says how long ago an expired token died", () => {
    const status = describeToken(jwt(NOW / 1000 - 5 * 86400), NOW);
    expect(status.kind).toBe("expired");
    expect(status.label).toMatch(/expired/i);
    expect(status.label).toContain("5");
  });

  it("treats the expiry second itself as expired", () => {
    expect(describeToken(jwt(NOW / 1000), NOW).kind).toBe("expired");
  });

  it("does not crash on a token it cannot decode", () => {
    expect(describeToken("not-a-jwt", NOW).kind).toBe("unreadable");
    expect(describeToken(jwt(undefined), NOW).kind).toBe("unreadable");
  });
});
