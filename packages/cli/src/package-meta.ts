import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppError, BUILDER_CREDIT, TOOL_NAME } from "@chatgpt-md-export/core";

const MAX_LOOKUP_DEPTH = 6;

interface PackageMeta {
  name: string;
  version: string;
}

/** Banner shared by --version, --help, and the success report. */
export function cliBanner(): string {
  const meta = readPackageMeta();
  return `${meta.name} v${meta.version} · ${BUILDER_CREDIT}`;
}

function readPackageMeta(): PackageMeta {
  const raw = JSON.parse(readFileSync(findPackageJsonPath(), "utf8")) as Partial<PackageMeta>;
  return { name: raw.name || TOOL_NAME, version: raw.version || "0.0.0" };
}

function findPackageJsonPath(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < MAX_LOOKUP_DEPTH; depth++) {
    const candidate = path.join(dir, "package.json");
    if (existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  throw new AppError("CLI_USAGE_ERROR", "Could not locate package.json next to the CLI entry point.");
}
