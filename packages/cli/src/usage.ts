import { cliBanner } from "./package-meta.js";

export const USAGE = `Usage:
  chatgpt-md-export <chatgpt-url> [options]
  chatgpt-md-export --archive <export-folder> [--conversation <id>] [options]
  chatgpt-md-export --archive <export-folder> --list

Sources:
  <chatgpt-url>            /c/, /share/, /share/e/, or /g/<project>/c/ URL (needs a bearer token)
  --archive <path>         Unzipped official ChatGPT data export, or its conversations.json

Options:
  -o, --out <dir>          Output root directory (default: ./chatgpt-exports)
  -a, --author <name>      Author name shown in the export header
  -c, --conversation <id>  Conversation id inside the archive (default: most recent)
  -l, --list               List the conversations found in the archive and exit
      --skip-files         Do not download or copy attachments
  -V, --version            Show version
  -h, --help               Show help

Examples:
  chatgpt-md-export "https://chatgpt.com/c/<id>" -a "Sam"
  chatgpt-md-export --archive ~/Downloads/chatgpt-export --list
  chatgpt-md-export --archive ~/Downloads/chatgpt-export -c <conversation-id>
`;

export function printUsage(): void {
  process.stderr.write(`${USAGE}\n${cliBanner()}\n`);
}
