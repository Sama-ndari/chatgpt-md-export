import { describe, expect, it } from "vitest";
import { sanitizeFileName, slugifyTitle } from "../src/export/slug.js";

describe("slugifyTitle", () => {
  it("slugifies titles", () => {
    expect(slugifyTitle("Mon Projet Cool!")).toBe("mon-projet-cool");
  });
});

describe("sanitizeFileName", () => {
  it("removes unsafe characters", () => {
    expect(sanitizeFileName('a/b:c?.png')).toBe("a_b_c_.png");
  });
});
