// Dexie/IndexedDB foundation for VibeBoard — ready for Tauri SQLite migration
// Сейчас Zustand persist на localStorage; этот модуль готовит схему для будущего Dexie + SQLite.
// Не импортируется по умолчанию, чтобы не тянуть зависимость в MVP, но структура описана.

export const DB_SCHEMA = `
-- SQLite (Tauri) / Dexie (Browser) unified schema — соответствует src/lib/types.ts
projects(id TEXT PK, code TEXT UNIQUE, name TEXT, description TEXT, type TEXT, status TEXT, local_path TEXT, progress INT, created_at TEXT, updated_at TEXT, git_repository TEXT, branch TEXT, last_commit TEXT)
project_languages(id TEXT PK, project_id FK, language TEXT, percentage INT, bytes INT)
project_technologies(id TEXT PK, project_id FK, technology TEXT)
tasks(id TEXT PK, project_id FK, number INT, title TEXT, description TEXT, status TEXT, priority TEXT, created_at TEXT, updated_at TEXT, completed_at TEXT)
ideas(id TEXT PK, project_id FK, title TEXT, description TEXT, created_at TEXT, converted_to_task TEXT)
notes(id TEXT PK, project_id FK, content TEXT, created_at TEXT, updated_at TEXT)
sessions(id TEXT PK, project_id FK, goal TEXT, summary TEXT, started_at TEXT, ended_at TEXT, tasks_completed TEXT)
activities(id TEXT PK, project_id FK, type TEXT, description TEXT, created_at TEXT)
` as const

export const DEXIE_TABLES = {
  projects: 'id, code, type, status, updated_at',
  project_languages: 'id, project_id, language',
  project_technologies: 'id, project_id',
  tasks: 'id, project_id, status, priority, updated_at',
  ideas: 'id, project_id',
  notes: 'id, project_id',
  sessions: 'id, project_id, started_at',
  activities: 'id, project_id, created_at',
} as const

// Example init (раскомментируй когда нужен Dexie):
// import Dexie from 'dexie'
// export class VibeDB extends Dexie {
//   projects!: Dexie.Table<any, string>
//   tasks!: Dexie.Table<any, string>
//   constructor(){ super('VibeBoard'); this.version(1).stores(DEXIE_TABLES) }
// }
// export const db = new VibeDB()

// Tauri migration path:
// 1. Replace zustand persist with dexie `liveQuery`
// 2. Add `tauri-plugin-sql` for SQLite — same SQL schema above
// 3. Sync via `y-crdt` or `automerge` over `tauri-plugin-websocket`
