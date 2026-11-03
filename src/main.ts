#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "./config/env-file.js";
import { exportConversation } from "./export/export-conversation.js";
import { BUILDER_CREDIT, TOOL_NAME } from "./shared/branding.js";
import { AppError, serializeError } from "./shared/errors.js";

interface CliArgs {
  url: string;
  outDir?: string;
  author?: string;
  skipFiles: boolean;
}

interface PackageMeta {
  name: string;
  version: string;
}

function findPackageJsonPath(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "package.json");
    if (existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  throw new AppError("CLI_USAGE_ERROR", "Could not locate package.json.");
}

function readPackageMeta(): PackageMeta {
  const raw = JSON.parse(readFileSync(findPackageJsonPath(), "utf8")) as PackageMeta;
  return { name: raw.name || TOOL_NAME, version: raw.version || "0.0.0" };
}

function cliBanner(): string {
  const pkg = readPackageMeta();
  return `${pkg.name} v${pkg.version} · ${BUILDER_CREDIT}`;
}

function printVersion(): void {
  process.stdout.write(`${cliBanner()}\n`);
}

function printUsage(): void {
  process.stderr.write(`Usage:
  chatgpt-md-export <chatgpt-url> [options]

Options:
  -o, --out <dir>       Output root directory (default: ./exports)
  -a, --author <name>   Author name shown in the markdown header
      --skip-files      Do not download attachments
  -V, --version         Show version
  -h, --help            Show help

${cliBanner()}

Examples:
  chatgpt-md-export "https://chatgpt.com/c/<id>"
  chatgpt-md-export "https://chatgpt.com/c/<id>" -o ./exports -a "Sam"
`);
}

function parseArgs(argv: string[]): CliArgs {
  if (argv.includes("-h") || argv.includes("--help")) {
    printUsage();
    process.exit(0);
  }
  if (argv.includes("-V") || argv.includes("--version")) {
    printVersion();
    process.exit(0);
  }

  let url: string | undefined;
  let outDir: string | undefined;
  let author: string | undefined;
  let skipFiles = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-o" || arg === "--out") {
      outDir = argv[++i];
      continue;
    }
    if (arg === "-a" || arg === "--author") {
      author = argv[++i];
      continue;
    }
    if (arg === "--skip-files") {
      skipFiles = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new AppError("CLI_USAGE_ERROR", `Unknown option: ${arg}`);
    }
    if (!url) {
      url = arg;
      continue;
    }
    throw new AppError("CLI_USAGE_ERROR", `Unexpected argument: ${arg}`);
  }

  if (!url) {
    throw new AppError("CLI_USAGE_ERROR", "Missing ChatGPT URL.");
  }

  return { url, outDir, author, skipFiles };
}

async function main(): Promise<void> {
  loadEnvFile(process.env);
  const args = parseArgs(process.argv.slice(2));
  const result = await exportConversation({
    url: args.url,
    outDir: args.outDir ? path.resolve(args.outDir) : undefined,
    author: args.author,
    skipFiles: args.skipFiles
  });

  process.stdout.write(
    [
      cliBanner(),
      `Exported: ${result.title}`,
      `Author:   ${result.author}`,
      `Markdown: ${result.markdownPath}`,
      `HTML:     ${result.htmlPath}`,
      `Files:    ${result.downloadedFiles} downloaded` +
        (result.failedFiles ? `, ${result.failedFiles} failed` : ""),
      `Folder:   ${result.outputDir}`,
      ""
    ].join("\n")
  );
}

main().catch((error) => {
  const serialized = serializeError(error);
  process.stderr.write(`${serialized.error_code}: ${serialized.message}\n`);
  if (error instanceof AppError && error.error_code === "CLI_USAGE_ERROR") {
    printUsage();
  }
  process.exit(1);
});
