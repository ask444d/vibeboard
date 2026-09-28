# Roadmap — VibeBoard Open Source

Public roadmap mirrors `GitHub Projects` board (same Kanban as `Tasks`).

## 1.0 ✅ (current)
- Local-first scan (File System Access + manual add + drag&drop + `.vibeboard.json`)
- Languages from real byte-level analysis + GitHub-style bar, honest empty states
- Tasks & Ideas Kanban (Board/List, drag) + Notes / Sessions (timer, pause, log) / Activity
- Real `.git/logs/HEAD` history + `commit → #001` linking, watch mode
- i18n en/ru, dark/light, health score + attention widget + weekly chart
- Global search with jump-to-card, OpenCode/Claude agent hooks, export/import, PWA

## 1.1 Desktop (Tauri)
- [ ] `src-tauri/tauri.conf.json` → SQLite (`src/lib/db.ts` schema) replaces `localStorage`
- [ ] Native `open` in Finder/Terminal/Editor via `src/lib/tauri.ts`
- [ ] `y-crdt` sync over LAN (Tauri)

## 1.2 Ecosystem
- [ ] `vibeboard-vscode` extension (status bar `WEB-001 72%`)
- [ ] `vibeboard-zed` (zed://)
- [ ] GitHub App read-only sync (issues→Ideas)

## How to influence
Open an issue with label `roadmap`, vote with 👍. Good first issues are `good first issue` label — start with `LANGUAGE_COLORS`, `TECH_DETECTORS`, i18n.

## Versioning
SemVer: `1.0.0` → `1.1.0` … Store `zustand` version `5` → Dexie migration planned.
