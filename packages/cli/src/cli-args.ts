import { AppError } from "@chatgpt-md-export/core";

export interface CliArgs {
  url?: string;
  archivePath?: string;
  conversationId?: string;
  outDir?: string;
  author?: string;
  listOnly: boolean;
  skipFiles: boolean;
}

type ValueFlag = "out" | "author" | "conversation" | "archive";

const VALUE_FLAGS: Record<string, ValueFlag> = {
  "-o": "out",
  "--out": "out",
  "-a": "author",
  "--author": "author",
  "-c": "conversation",
  "--conversation": "conversation",
  "--archive": "archive"
};

/** Parse argv (without node and script). Throws CLI_USAGE_ERROR on bad input. */
export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { listOnly: false, skipFiles: false };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const valueFlag = VALUE_FLAGS[arg];
    if (valueFlag) {
      assignValue(args, valueFlag, argv[++index], arg);
      continue;
    }
    if (arg === "--skip-files") {
      args.skipFiles = true;
      continue;
    }
    if (arg === "-l" || arg === "--list") {
      args.listOnly = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new AppError("CLI_USAGE_ERROR", `Unknown option: ${arg}`);
    }
    if (args.url) {
      throw new AppError("CLI_USAGE_ERROR", `Unexpected argument: ${arg}`);
    }
    args.url = arg;
  }

  return validate(args);
}

function assignValue(args: CliArgs, flag: ValueFlag, value: string | undefined, raw: string): void {
  if (!value || value.startsWith("-")) {
    throw new AppError("CLI_USAGE_ERROR", `Option ${raw} requires a value.`);
  }
  if (flag === "out") args.outDir = value;
  if (flag === "author") args.author = value;
  if (flag === "conversation") args.conversationId = value;
  if (flag === "archive") args.archivePath = value;
}

function validate(args: CliArgs): CliArgs {
  if (args.url && args.archivePath) {
    throw new AppError("CLI_USAGE_ERROR", "Pass either a ChatGPT URL or --archive, not both.");
  }
  if (!args.url && !args.archivePath) {
    throw new AppError("CLI_USAGE_ERROR", "Missing ChatGPT URL or --archive path.");
  }
  if (args.listOnly && !args.archivePath) {
    throw new AppError("CLI_USAGE_ERROR", "--list only applies to --archive.");
  }
  if (args.conversationId && !args.archivePath) {
    throw new AppError("CLI_USAGE_ERROR", "--conversation only applies to --archive.");
  }
  return args;
}
