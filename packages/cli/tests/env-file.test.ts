import path from "node:path";
import { describe, expect, it } from "vitest";
import { applyEnvFile, getFallbackEnvFilePaths, parseEnvFile } from "../src/env-file.js";

describe("parseEnvFile", () => {
  it("parses export and quoted values", () => {
    const values = parseEnvFile(`
# comment
export CHATGPT_BEARER_TOKEN="tok"
CHATGPT_AUTHOR_NAME='Sam'
`);
    expect(values.CHATGPT_BEARER_TOKEN).toBe("tok");
    expect(values.CHATGPT_AUTHOR_NAME).toBe("Sam");
  });
});

describe("applyEnvFile", () => {
  it("does not override existing env values", () => {
    const env: NodeJS.ProcessEnv = { CHATGPT_BEARER_TOKEN: "existing" };
    applyEnvFile(env, { CHATGPT_BEARER_TOKEN: "file", CHATGPT_AUTHOR_NAME: "Sam" });
    expect(env.CHATGPT_BEARER_TOKEN).toBe("existing");
    expect(env.CHATGPT_AUTHOR_NAME).toBe("Sam");
  });
});

describe("env file paths", () => {
  it("looks at the project .env first", () => {
    expect(getFallbackEnvFilePaths({})[0]).toBe(path.join(process.cwd(), ".env"));
  });

  it("honors CHATGPT_MD_EXPORT_ENV_FILE override alone", () => {
    const override = "/tmp/custom.env";
    expect(getFallbackEnvFilePaths({ CHATGPT_MD_EXPORT_ENV_FILE: override })).toEqual([override]);
  });
});
