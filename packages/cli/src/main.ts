#!/usr/bin/env node
import path from "node:path";
import {
  AppError,
  exportConversationFromArchive,
  exportConversationFromUrl,
  readExportArchive,
  serializeError,
  summarizeArchive,
  type ConversationExportResult
} from "@chatgpt-md-export/core";
import { parseArgs, type CliArgs } from "./cli-args.js";
import { loadEnvFile } from "./env-file.js";
import { cliBanner } from "./package-meta.js";
import { formatArchiveListing, formatExportReport } from "./report.js";
import { printUsage } from "./usage.js";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help")) {
    printUsage();
    return;
  }
  if (argv.includes("-V") || argv.includes("--version")) {
    process.stdout.write(`${cliBanner()}\n`);
    return;
  }

  loadEnvFile(process.env);
  const args = parseArgs(argv);

  if (args.archivePath && args.listOnly) {
    const archive = await readExportArchive(args.archivePath);
    process.stdout.write(formatArchiveListing(summarizeArchive(archive)));
    return;
  }

  process.stdout.write(formatExportReport(await runExport(args)));
}

function resolveOutRoot(outDir: string | undefined): string {
  return path.resolve(outDir ?? path.join(process.cwd(), "exports"));
}

async function runExport(args: CliArgs): Promise<ConversationExportResult> {
  const outRoot = resolveOutRoot(args.outDir);

  if (args.archivePath) {
    return exportConversationFromArchive({
      archive: await readExportArchive(args.archivePath),
      conversationId: args.conversationId,
      outRoot,
      author: args.author,
      skipAttachments: args.skipFiles
    });
  }

  if (!args.url) {
    throw new AppError("CLI_USAGE_ERROR", "Missing ChatGPT URL.");
  }
  return exportConversationFromUrl({
    url: args.url,
    outRoot,
    author: args.author,
    skipAttachments: args.skipFiles,
    env: process.env
  });
}

main().catch((error: unknown) => {
  const serialized = serializeError(error);
  process.stderr.write(`${serialized.error_code}: ${serialized.message}\n`);
  if (error instanceof AppError && error.error_code === "CLI_USAGE_ERROR") {
    printUsage();
  }
  process.exit(1);
});
