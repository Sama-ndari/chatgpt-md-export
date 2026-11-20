# ChatGPT Markdown Export

Save a ChatGPT conversation as clean Markdown, without leaving your editor.

Useful when you want to hand a conversation to another model, keep it in a repository,
or simply read it offline.

> Unofficial. Not affiliated with OpenAI.

## Features

- **Clean Markdown.** One file, plain `## Author` / `## Assistant` headings, ready for any model.
- **Readable HTML.** The same conversation as a collapsible chat view, with a preview panel inside VS Code.
- **Attachments included.** Images and documents are saved next to the Markdown, with working links.
- **Raw JSON.** The untouched payload, in case you need a field the Markdown drops.
- **Two sources.** Your official ChatGPT data export, or a live conversation link.
- **Safe token storage.** Your bearer token goes to the OS keychain, never to a file.

## Getting started

Open the **ChatGPT Export** icon in the Activity Bar, on the left. Everything happens there:
the two export buttons, your recent exports, and your token.

### Without a token (recommended)

1. In ChatGPT, go to **Settings → Data controls → Export data**, and confirm.
2. Unzip the archive you get by email.
3. Click **From your ChatGPT data export**, select the unzipped folder.
4. Pick a conversation from the list.

This works for everyone and exports attachments straight from the archive.

### From a conversation link

1. Click **Bearer token** in the sidebar, and paste your token.
2. Click **From a ChatGPT link**, and paste the conversation URL.

Supports `/c/`, `/share/` and project links. Public `/share/` links need no token.

### Where to find your bearer token

1. Sign in at [chatgpt.com](https://chatgpt.com).
2. Open [chatgpt.com/api/auth/session](https://chatgpt.com/api/auth/session) in the same browser.
3. Copy the value of `accessToken` from the JSON that appears.

The **Get my token** button in the sidebar opens that page for you.

The token is a session secret, like a password. It expires after a while, so expect to replace
it from time to time. The extension keeps it in your operating system's keychain, never in a
file, and sends it only to `chatgpt.com`.

## Where exports go

Every export is written to **`chatgpt-exports/` at the root of the workspace you currently
have open in VS Code**, one folder per conversation:

```
<your workspace>/
  chatgpt-exports/
    my-conversation-abcd1234/
      conversation.md      clean Markdown
      conversation.html    collapsible chat view
      conversation.json    raw payload
      files/               attachments
```

The panel shows the exact folder above your recent exports. To send them somewhere else, set
`chatgptMdExport.outputDirectory` to another relative path, or to an absolute one. With no
workspace open, exports go to a temporary folder instead.

An attachment that cannot be fetched never stops an export: it becomes a short note in the
Markdown explaining why.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `chatgptMdExport.outputDirectory` | `chatgpt-exports` | Where exports go, relative to the workspace root or absolute |
| `chatgptMdExport.authorName` | *(empty)* | Name shown as the author in the export header |
| `chatgptMdExport.downloadAttachments` | `true` | Save attachments alongside the Markdown |
| `chatgptMdExport.accountId` | *(empty)* | Only needed for Team and Enterprise workspaces |
| `chatgptMdExport.openAfterExport` | `preview` | `preview`, `markdown`, or `none` |

## Requirements

VS Code 1.90 or later. Nothing else to install.

## Known limitations

- The ChatGPT data export must be unzipped first. Point the extension at the folder, not the `.zip`.
- Link mode uses chatgpt.com's private API. It can change without notice, and the token expires.
- Attachments uploaded by another account cannot be downloaded, by design.

## Rate it

If this saved you time, a rating helps other people find it:
**[leave a review on the Marketplace](https://marketplace.visualstudio.com/items?itemName=samandari.chatgpt-md-export-vscode&ssr=false#review-details)**.
It takes ten seconds and it is the single most useful thing you can do for a small extension.

Found a bug or want something added?
[Open an issue](https://github.com/Sama-ndari/chatgpt-md-export/issues).

## Release notes

See the [changelog](CHANGELOG.md).

## Contributing

Source, issues and the CLI version of this tool:
[github.com/Sama-ndari/chatgpt-md-export](https://github.com/Sama-ndari/chatgpt-md-export)

Built by Samandari. MIT licensed.
