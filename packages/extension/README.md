# ChatGPT Markdown Export — VS Code extension

Export a ChatGPT conversation into clean Markdown, a standalone HTML chat view, the raw
JSON payload, and the conversation's attachments — without leaving the editor.

> **Unofficial.** Not affiliated with OpenAI.

## Commands

| Command | What it does |
| --- | --- |
| `ChatGPT Export: Export Conversation from URL` | Paste a `/c/`, `/share/` or project link and export it |
| `ChatGPT Export: Export Conversation from Official Archive` | Pick an unzipped ChatGPT data export and choose a conversation |
| `ChatGPT Export: Set Bearer Token` | Store your token in the OS keychain |
| `ChatGPT Export: Clear Bearer Token` | Remove the stored token |
| `ChatGPT Export: Preview Last Export` | Reopen the last export in a side panel |

## Two ways to export

**Official archive — no token, works for everyone.** Request your data in ChatGPT
(*Settings → Data controls → Export data*), unzip the archive you receive by email, then run
*Export Conversation from Official Archive* and pick a conversation.

**URL — live, needs a bearer token.** Copy the `Authorization` header value from a signed-in
`chatgpt.com` request in your browser's network tab, store it with *Set Bearer Token*, then run
*Export Conversation from URL*. The token is a session secret: it is stored in your OS keychain
and never written to disk in plain text. Public `/share/` links work without a token.

## What you get

```text
exports/
  my-conversation-abcd1234/
    conversation.md    # clean Markdown, ready to hand to another model
    conversation.html  # collapsible chat view
    conversation.json  # raw payload
    files/             # attachments
```

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| `chatgptMdExport.outputDirectory` | `exports` | Output folder, relative to the workspace root or absolute |
| `chatgptMdExport.authorName` | *(empty)* | Name shown as the author in the export header |
| `chatgptMdExport.downloadAttachments` | `true` | Download or copy attachments |
| `chatgptMdExport.accountId` | *(empty)* | Only needed for Team and Enterprise workspaces |
| `chatgptMdExport.openAfterExport` | `preview` | `preview`, `markdown`, or `none` |

## Development

```bash
npm install          # from the repository root
npm run build        # builds core, CLI, and this extension
```

Press <kbd>F5</kbd> in the repository root to launch an Extension Development Host.

Built by Samandari. MIT licensed.
