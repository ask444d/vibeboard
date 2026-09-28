# Roadmap — VibeBoard Open Source

Public roadmap mirrors `GitHub Projects` board (same Kanban as `Tasks`).

## 0.1 MVP ✅ (current)
- Local-first scan (File System Access + manual `📁 Добавить папку` + drag&drop + `.vibeboard.json`)
- Languages (real byte analysis + synthetic fallback) + GitHub bar
- Tasks Kanban (Board/List, drag, `TODO/IN_PROGRESS/REVIEW/DONE/BLOCKED`) + Ideas/Notes/Sessions/Activity
- i18n en/ru + coverage %, dark/light, health score + weekly chart, sharing `.vibeboard.json`/bundle

## 0.2 Deep Local (next 2 weeks)
- [ ] Watch mode: `FileSystemObserver` + polling for `node_modules` ignore
- [ ] Real `git log` via `src/lib/git.ts` + link `commit → #001`
- [ ] `isomorphic-git` status diff in panel

## 0.4 Desktop (Tauri)
- [ ] `src-tauri/tauri.conf.json` → SQLite (`src/lib/db.ts` schema) replaces `localStorage`
- [ ] Native `open` in Finder/Terminal/Editor via `src/lib/tauri.ts`
- [ ] `y-crdt` sync over LAN (Tauri)

## 0.5 Ecosystem
- [ ] `vibeboard-vscode` extension (status bar `WEB-001 72%`)
- [ ] `vibeboard-zed` (zed://)
- [ ] GitHub App read-only sync (issues→Ideas)

## How to influence
Open an issue with label `roadmap`, vote with 👍. Good first issues are `good first issue` label — start with `LANGUAGE_COLORS`, `TECH_DETECTORS`, i18n.

## Versioning
SemVer: `0.1.0` → `0.2.0` → `1.0` (stable DB). Store `zustand` version `3` → Dexie migration planned.
