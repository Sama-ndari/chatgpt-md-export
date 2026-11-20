# Changelog

All notable changes to the ChatGPT Markdown Export extension are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
