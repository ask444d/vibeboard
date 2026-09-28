# Contributing to VibeBoard

Thanks for wanting to contribute! VibeBoard is local-first, open source, Apple+Linear styled.

## Quick start

```bash
git clone https://github.com/you/vibeboard
cd vibeboard
npm install
npm run dev    # http://localhost:5173
npm run build  # tsc -b && vite build
```

Requirements: Node 18+, Chromium for File System Access API (`showDirectoryPicker`). Safari/Firefox → manual `+ Add folder` or type path.

## Project structure

```
src/lib/types.ts        — Project/Task/Idea/Note/Session/Activity
src/lib/constants.ts    — LANGUAGE_COLORS, IGNORED_DIRS, TECH_DETECTORS
src/lib/utils.ts        — analyzeLanguages, detectTechStack, scanDirectoryHandle, readFolderHandle, .vibeboard.json
src/lib/i18n.ts         — en/ru dicts, getCoverage()
src/lib/health.ts       — computeHealth()
src/lib/git.ts          — isomorphic-git + .git/logs/HEAD parser
src/lib/db.ts           — Dexie/SQLite schema
src/lib/plugins.ts      — plugin API
src/store/useStore.ts   — Zustand persist (localStorage, v3 → Dexie future)
src/components/TaskBoard.tsx — Kanban board
src/pages/*.tsx
src-tauri/tauri.conf.json — desktop foundation
```

## Good first issues

- Add language to `LANGUAGE_COLORS` / `LANGUAGE_EXT` in `constants.ts`
- Add tech detector in `TECH_DETECTORS` / `detectTechStack`
- Add i18n keys in `i18n.ts` (check `getCoverage()`)
- Improve `computeHealth()` weights

Label: `good first issue` in GitHub Issues.

## Conventions

- No fake/demo data by default — clean start. Demo only via `Settings → Reset to demo`.
- Local-first: never upload code without explicit user action.
- Design: rounded-2xl, border, `card-hover`, `Inter`/`JetBrains Mono`, dark/light via `html.dark`.
- Commits: `feat:`, `fix:`, `docs:`, `chore:` — keep small.
- Before PR: `npm run build` must pass, add test in `src/lib/__tests__/` if touching core.

## Tests

```bash
npm test          # vitest run
npm run test:watch
```

Core: `generateProjectCode`, `calcProgress`, `analyzeLanguages`, `computeHealth` — see `src/lib/__tests__/`.

## Adding a plugin

```ts
// src/lib/plugins.ts
import { registerDetector } from './plugins'
registerDetector({ file: 'deno.json', techs: ['Deno'] })
registerDetector({ file: 'bun.lockb', techs: ['Bun'] })
```

See `src/lib/plugins.ts` for API.

## Questions?

Open a Discussion or Discord — link in README. Be kind, see `CODE_OF_CONDUCT.md`.
