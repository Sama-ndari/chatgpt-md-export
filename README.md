# chatgpt-md-export

**Built by Samandari**

Export a ChatGPT conversation into clean Markdown, a standalone HTML chat view, the raw JSON
payload, and the conversation's attachments. Available as a CLI and as a VS Code extension.

Goal: hand the Markdown + `files/` to another model, without re-scraping the UI.

> **Unofficial.** Not affiliated with OpenAI. The URL mode uses chatgpt.com's private API and
> your bearer token, which is a session secret. Never commit it.

## Packages

| Package | What it is |
| --- | --- |
| [`packages/core`](packages/core) | Shared logic: fetching, archive parsing, Markdown/HTML rendering |
| [`packages/cli`](packages/cli) | The `chatgpt-md-export` command-line tool |
| [`packages/extension`](packages/extension) | The VS Code extension |

## Two ways to export

**Official archive, no token required.** Request your data in ChatGPT (*Settings → Data controls →
Export data*), unzip what you receive, and point the tool at the folder. Works for everyone,
exports attachments from the archive itself.

**Live URL, bearer token required.** Copy the `Authorization` header value from a signed-in
`chatgpt.com` request. Supports `/c/`, `/share/`, `/share/e/`, and project conversations.
Public `/share/` links work without a token.

## Quick start: CLI

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
  -o, --out <dir>          Output root directory (default: ./chatgpt-exports)
  -a, --author <name>      Author name shown in the export header
  -c, --conversation <id>  Conversation id inside the archive (default: most recent)
  -l, --list               List the conversations found in the archive and exit
      --skip-files         Do not download or copy attachments
  -V, --version            Show version
  -h, --help               Show help
```

## Quick start: VS Code extension

The extension is on the Visual Studio Marketplace:

```bash
code --install-extension samandari.chatgpt-md-export-vscode
```

[View it on the Marketplace.](https://marketplace.visualstudio.com/items?itemName=samandari.chatgpt-md-export-vscode)
If it saves you time, [a rating](https://marketplace.visualstudio.com/items?itemName=samandari.chatgpt-md-export-vscode&ssr=false#review-details)
helps other people find it.

Everything happens in the **ChatGPT Export** panel in the Activity Bar: the two export
buttons, your recent exports, and your token.

To work on it from source instead:

```bash
npm install && npm run build
```

Press <kbd>F5</kbd> to launch an Extension Development Host. To install your own build:

```bash
npm run package -w chatgpt-md-export-vscode
code --install-extension packages/extension/chatgpt-md-export-vscode-*.vsix
```

The extension stores the bearer token in the OS keychain through VS Code's `SecretStorage`,
never in a file. See [the extension README](packages/extension/README.md) for its settings.

## Output

```text
chatgpt-exports/
  my-conversation-abcd1234/
    conversation.md    # clean Markdown, for another model or plain reading
    conversation.html  # collapsible chat view, open in a browser
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

## Releasing the extension

Publishing is automated. A tag starting with `v` triggers
[`.github/workflows/publish.yml`](.github/workflows/publish.yml), which runs `npm run check`,
packages the extension once, and sends that same archive to two registries:

| Registry | Reaches | Authentication |
| --- | --- | --- |
| Visual Studio Marketplace | VS Code | Trusted Publishing over GitHub OIDC, no stored token |
| Open VSX | Cursor, Windsurf, VSCodium | `OVSX_PAT` repository secret |

Azure DevOps retires global PATs on December 1, 2026, which is why the Marketplace step uses
OIDC. Open VSX has no OIDC support, so it needs a token. The Open VSX step is skipped while
`OVSX_PAT` is unset, so a release never fails over a missing secret.

Setting up Open VSX once: sign in at [open-vsx.org](https://open-vsx.org) with GitHub, sign the
publisher agreement, create the `samandari` namespace, generate an access token, then store it as
the `OVSX_PAT` secret under the repository's **Settings > Secrets and variables > Actions**.

To cut a release, say `0.3.0`:

1. Bump `version` in [`packages/extension/package.json`](packages/extension/package.json).
2. Add the matching section to [`packages/extension/CHANGELOG.md`](packages/extension/CHANGELOG.md).
3. Commit, push, tag, push the tag:

   ```bash
   git commit -am "chore(release): extension 0.3.0"
   git push origin main
   git tag v0.3.0
   git push origin v0.3.0
   ```

4. Follow the run under the repository's **Actions** tab.

Rules worth remembering:

- **The tag version and the manifest version must match.** The workflow publishes whatever
  `packages/extension/package.json` says; the tag is only the trigger.
- **A published version number is burned.** The Marketplace rejects a re-publish of an existing
  version, so a failed publish after upload means moving to the next patch number.
- **A failed run before the publish step burns nothing.** Fix, push, then repoint the tag:

  ```bash
  git push origin --delete refs/tags/v0.3.0
  git tag -d v0.3.0
  git tag v0.3.0
  git push origin v0.3.0
  ```

- The Marketplace takes a few minutes to validate a new version before
  `code --install-extension` can find it.

## Development

```bash
npm run lint        # ESLint across every package
npm test            # vitest
npm run typecheck   # tsc -b
npm run build       # core → CLI → extension bundle
npm run check       # all of the above
```

MIT licensed.
