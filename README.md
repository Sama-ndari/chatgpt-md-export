# chatgpt-md-export

**Built by Samandari**

Export a ChatGPT conversation into clean Markdown, a standalone HTML chat view, the raw JSON
payload, and the conversation's attachments. Available as a CLI and as a VS Code extension.

Goal: hand the Markdown + `files/` to another model, without re-scraping the UI.

> **Unofficial** — not affiliated with OpenAI. The URL mode uses chatgpt.com's private API and
> your bearer token, which is a session secret. Never commit it.

## Packages

| Package | What it is |
| --- | --- |
| [`packages/core`](packages/core) | Shared logic: fetching, archive parsing, Markdown/HTML rendering |
| [`packages/cli`](packages/cli) | The `chatgpt-md-export` command-line tool |
| [`packages/extension`](packages/extension) | The VS Code extension |

## Two ways to export

**Official archive — no token.** Request your data in ChatGPT (*Settings → Data controls →
Export data*), unzip what you receive, and point the tool at the folder. Works for everyone,
exports attachments from the archive itself.

**Live URL — needs a bearer token.** Copy the `Authorization` header value from a signed-in
`chatgpt.com` request. Supports `/c/`, `/share/`, `/share/e/`, and project conversations.
Public `/share/` links work without a token.

## Quick start — CLI

```bash
npm install
npm run build

# From an unzipped official export
node packages/cli/dist/main.js --archive ~/Downloads/chatgpt-export --list
node packages/cli/dist/main.js --archive ~/Downloads/chatgpt-export -c <conversation-id>

# From a live URL
cp .env.example .env     # then paste CHATGPT_BEARER_TOKEN
node packages/cli/dist/main.js "https://chatgpt.com/c/<conversation-id>" -a "Sam"
```

### Options

```text
  -o, --out <dir>          Output root directory (default: ./exports)
  -a, --author <name>      Author name shown in the export header
  -c, --conversation <id>  Conversation id inside the archive (default: most recent)
  -l, --list               List the conversations found in the archive and exit
      --skip-files         Do not download or copy attachments
  -V, --version            Show version
  -h, --help               Show help
```

## Quick start — VS Code extension

```bash
npm install && npm run build
```

Press <kbd>F5</kbd> to launch an Extension Development Host, then run
**ChatGPT Export: Export Conversation from URL** or
**ChatGPT Export: Export Conversation from Official Archive** from the command palette.

To install it locally instead:

```bash
npm run package -w chatgpt-md-export-vscode
code --install-extension packages/extension/chatgpt-md-export-vscode-*.vsix
```

The extension stores the bearer token in the OS keychain through VS Code's `SecretStorage`,
never in a file. See [the extension README](packages/extension/README.md) for its settings.

## Output

```text
exports/
  my-conversation-abcd1234/
    conversation.md    # clean Markdown, for another model or plain reading
    conversation.html  # collapsible chat view — open in a browser
    conversation.json  # raw payload
    files/             # attachments
      screenshot.png
      notes.pdf
```

Attachments never abort an export: a file that cannot be fetched becomes an inline note
explaining why (blocked by another account, missing from the archive, skipped).

## Configuration (CLI)

Values are read from the process environment first, then from the first file that exists among
`./.env`, `~/.config/chatgpt-md-export/env`, and `~/.config/mcp-contexte-gpt/env`. Override the
lookup with `CHATGPT_MD_EXPORT_ENV_FILE`.

| Variable | Purpose |
| --- | --- |
| `CHATGPT_BEARER_TOKEN` | Required for private conversations and attachment downloads |
| `CHATGPT_ACCOUNT_ID` | Only for Team and Enterprise workspaces |
| `CHATGPT_AUTHOR_NAME` | Default author name in the export header |

## Development

```bash
npm run lint        # ESLint across every package
npm test            # vitest
npm run typecheck   # tsc -b
npm run build       # core → CLI → extension bundle
npm run check       # all of the above
```

MIT licensed.
