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
- [x] Tauri v2 init: `src-tauri/` (Cargo, capabilities, icons), `npm run tauri dev/build`
- [x] Native folder pick + scan via plugin-fs/dialog (`src/lib/tauriFs.ts`), native watch roots
- [x] Native `open` in Finder/Editor via plugin-shell/opener (`src/lib/tauri.ts`)
- [x] CI `.dmg` for macOS arm64 + x64 on tags `v*` (draft release)
- [ ] `src-tauri/tauri.conf.json` → SQLite (`src/lib/db.ts` schema) replaces `localStorage`
- [ ] `y-crdt` sync over LAN (Tauri)

## 1.2 Ecosystem
- [ ] `vibeboard-vscode` extension (status bar `WEB-001 72%`)
- [ ] `vibeboard-zed` (zed://)
- [ ] GitHub App read-only sync (issues→Ideas)

## How to influence
Open an issue with label `roadmap`, vote with 👍. Good first issues are `good first issue` label — start with `LANGUAGE_COLORS`, `TECH_DETECTORS`, i18n.

## Versioning
SemVer: `1.0.0` → `1.1.0` … Store `zustand` version `5` → Dexie migration planned.
