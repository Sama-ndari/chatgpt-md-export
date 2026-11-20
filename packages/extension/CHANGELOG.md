# Changelog

All notable changes to the ChatGPT Markdown Export extension are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-11-20

### Fixed

- The panel no longer overflows a narrow sidebar. A few labels were set to never wrap, and
  because flex items default to a minimum width of their content, those labels set the width
  of the whole panel and clipped everything else. Labels now wrap or truncate, buttons move
  to their own line when there is no room, and the layout holds down to a very narrow panel.

[0.4.1]: https://github.com/Sama-ndari/chatgpt-md-export/releases/tag/v0.4.1

## [0.4.0] - 2026-11-20

### Added

- A rating card that appears after three exports, and a review link in the panel footer.

- Progress reporting during an export: the notification and the panel both show the current
  stage, including "Attachment 3 of 7" while files download.
- A "Built by Samandari" link in the panel footer, and in the exported Markdown and HTML.

### Changed

- The Activity Bar panel is now a designed view instead of a plain tree: action cards, a
  recent exports list with hover actions, and a token status indicator.
- The default output directory is now `chatgpt-exports` instead of `exports`, which collided
  with a meaningful folder name in JavaScript projects. Set
  `chatgptMdExport.outputDirectory` to keep the old location.
- **Get my token** opens `chatgpt.com/api/auth/session`, where the token can be copied
  directly, instead of a page explaining how to dig through the network tab.
- Removed em dashes and curly quotes from every message, label and document.

[0.4.0]: https://github.com/Sama-ndari/chatgpt-md-export/releases/tag/v0.4.0

## [0.3.0] - 2026-11-20

### Added

- Activity Bar view listing the two export actions, your recent exports, and the token state.
  Exports can be reopened, revealed in the file manager, or removed from the list.
- Recent exports are remembered per workspace, instead of only the last one.

### Changed

- Rewrote the README around what the extension does, rather than how it is built.

[0.3.0]: https://github.com/Sama-ndari/chatgpt-md-export/releases/tag/v0.3.0

## [0.2.0] - 2026-11-20

### Added

- Export a ChatGPT conversation from a `/c/`, `/share/`, `/share/e/` or project URL.
- Export a conversation from an unzipped official ChatGPT data export, with no token required.
- Bearer token storage through VS Code `SecretStorage`, backed by the OS keychain.
- Preview panel that reopens the most recent export, with attachments resolved to webview URIs.
- Settings for the output directory, author name, attachment downloads, account id, and what
  opens after an export.
- French localization of the command palette entries, settings, and runtime messages.

[0.2.0]: https://github.com/Sama-ndari/chatgpt-md-export/releases/tag/v0.2.0
