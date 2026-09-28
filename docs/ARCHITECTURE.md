# Architecture

## Stack
Vite + React 19 + TS + Tailwind + React Router + Zustand persist (localStorage v3) → future Dexie/SQLite. `isomorphic-git` for git.

## Data flow
```
FileSystemHandle (user gesture)
  → scanDirectoryHandle / readFolderHandle / collectVirtualFiles
  → analyzeLanguages (bytes) + detectTechStack
  → useStore.addProjectFromHandle / addProjectFromFolder
  → projects[] + tasks[] → computeHealth, WeeklyChart
```

## Types
`src/lib/types.ts` — Project (code `WEB-001`, local_path, `git_repository`, languages[]), Task (`#001`, project_id), Idea, Note, Session, Activity. DB schema in `src/lib/db.ts` (Dexie + SQLite unified).

## Key modules
- `utils.ts` — `generateProjectCode`, `calcProgress`, `scanDirectoryHandle`, `readFolderHandle`, `collectVirtualFiles`, `readVibeConfig`
- `i18n.ts` — en/ru dicts, `getCoverage()`
- `health.ts` — `computeHealth()` = progress*0.35 + blocked*0.25 + freshness*0.2 + git*0.2
- `git.ts` — `.git/logs/HEAD` parser (browser) + `isomorphic-git` for Tauri
- `tauri.ts` — `isTauri()`, `tauriOpen()`
- `plugins.ts` — `registerTechDetector`, `getDetectors()`
- `db.ts` — schema for migration
- `TaskBoard.tsx` — Kanban drag between `TODO/IN_PROGRESS/REVIEW/DONE/BLOCKED`
- `store/useStore.ts` — all actions, `migrate v3` wipes demo for clean open source start

## Local-first
- No code upload without `showDirectoryPicker` gesture.
- `localStorage` now, Dexie `src/lib/db.ts:1` next, Tauri SQLite `src-tauri/tauri.conf.json:1`.
- `.vibeboard.json` in project root overrides `type/status/code` on add.

## Open source plugin API
See `src/lib/plugins.ts` — register new `file → techs` without forking.

## Decisions (ADRs)
- Zustand persist over Dexie for MVP — smaller bundle, easy migrate via `version`.
- Synthetic languages fallback when handle not traversable (Safari).
- Kanban drag via native HTML5, not library — keeps bundle 410kB.
