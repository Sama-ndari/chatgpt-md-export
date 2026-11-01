import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const ENV_FILE_KEYS = [
  "CHATGPT_BEARER_TOKEN",
  "CHATGPT_ACCOUNT_ID",
  "CHATGPT_AUTHOR_NAME"
] as const;

export type EnvFileKey = (typeof ENV_FILE_KEYS)[number];

export function getEnvFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env.CHATGPT_MD_EXPORT_ENV_FILE?.trim() ||
    path.join(process.cwd(), ".env")
  );
}

/** Prefer project `.env`, then XDG config, then mcp-contexte-gpt reuse. */
export function getFallbackEnvFilePaths(env: NodeJS.ProcessEnv = process.env): string[] {
  const override = env.CHATGPT_MD_EXPORT_ENV_FILE?.trim();
  if (override) return [override];
  return [
    path.join(process.cwd(), ".env"),
    path.join(os.homedir(), ".config", "chatgpt-md-export", "env"),
    path.join(os.homedir(), ".config", "mcp-contexte-gpt", "env")
  ];
}

/** Fills missing variables from fallback env files. Returns the first file path that was read. */
export function loadEnvFile(env: NodeJS.ProcessEnv = process.env): string | undefined {
  for (const filePath of getFallbackEnvFilePaths(env)) {
    if (!fs.existsSync(filePath)) continue;
    applyEnvFile(env, parseEnvFile(fs.readFileSync(filePath, "utf8")));
    return filePath;
  }
  return undefined;
}

/** Accepts `KEY=value`, `export KEY=value`, and single- or double-quoted values. */
export function parseEnvFile(text: string): Partial<Record<EnvFileKey, string>> {
  const values: Partial<Record<EnvFileKey, string>> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^export\s+/, "");
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    if (!(ENV_FILE_KEYS as readonly string[]).includes(key)) continue;
    values[key as EnvFileKey] = unquote(line.slice(eq + 1).trim());
  }
  return values;
}

/** Process environment wins over env file values; empty process values do not. */
export function applyEnvFile(env: NodeJS.ProcessEnv, fileValues: Partial<Record<EnvFileKey, string>>): void {
  for (const key of ENV_FILE_KEYS) {
    const fileValue = fileValues[key];
    if (fileValue !== undefined && !env[key]) env[key] = fileValue;
  }
}

function unquote(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    if ((first === '"' || first === "'") && value.endsWith(first)) return value.slice(1, -1);
  }
  return value.replace(/\s+#.*$/, "");
}
