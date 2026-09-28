# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x (MVP) | ✅ |

VibeBoard is local-first — code never leaves the device without explicit user action (File System Access API, `vscode://`, `localStorage`). No backend stores code.

## Reporting a Vulnerability

- **Do not** open a public issue for security bugs.
- Email: `security@vibeboard.dev` or open a private security advisory on GitHub (Security → Advisories).
- We will respond within 72h, fix within 14 days, and credit you unless you prefer anonymity.

## What to report

- XSS via project/task markdown, localStorage injection, path traversal via `.vibeboard.json`, Tauri shell open command injection.

## What not to report

- File System Access API requiring user gesture — by design (browser sandbox).
