# VibeBoard Status (VS Code extension)

Live VibeBoard project stats in the VS Code status bar. Local-first: reads the
VibeBoard desktop SQLite database. No accounts, no cloud.

## What it shows

```
$(pulse) WEB-001 · 12/16 · 75%
```

Project code, done/total tasks and progress. The project is auto-detected from
your open workspace folder (`local_path` match), or picked manually — click the
status bar item or run **VibeBoard: Select Project**.

## Commands

- **VibeBoard: Select Project** — pin a project to the status bar
- **VibeBoard: Refresh Status** — re-read the database now
- **VibeBoard: Reveal Project Folder in OS** — open the project folder in Finder/Explorer
- **VibeBoard: Open Dashboard App** — launch the VibeBoard desktop app

## Settings

- `vibeboard.dbPath` — override path to `vibeboard.db` (file or directory).
  Default auto-detects per OS from the Tauri app-data dir, e.g. macOS:
  `~/Library/Application Support/com.vibeboard.app/vibeboard.db`
- `vibeboard.refreshIntervalSec` — re-read interval (default 30, min 5).
  Also refreshes on every file save.
- `vibeboard.dashboardCommand` — custom shell command to open the dashboard
  (default macOS: `open -a VibeBoard`).

If the database is missing you get `VibeBoard: no data` — open the desktop app
at least once so it creates `vibeboard.db`.

## Develop

```bash
cd extensions/vscode
npm install
npm run compile   # tsc → out/
```

Press F5 in VS Code to run the Extension Development Host. Package with
`npx @vscode/vsce package` (set your own `publisher` id in package.json first).
