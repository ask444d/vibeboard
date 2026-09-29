// Hybrid persist storage: SQLite file on Tauri desktop, localStorage in browser.
// Same zustand `persist` API, zero changes to store actions/selectors.
//
// How it works:
// - Tauri: whole persisted state JSON lives in one kv row (`vibeboard.db`,
//   app-data dir, e.g. ~/Library/Application Support/com.vibeboard.app/).
//   Relational tables (see db.ts schema) come later; kv keeps migration safe.
// - First desktop launch transparently imports existing localStorage data.
// - If SQLite is unavailable for any reason, silently falls back to localStorage.

import { isTauri } from './tauri'

const DB_PATH = 'sqlite:vibeboard.db'
const TABLE_SQL =
  'CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT)'

type SqlDb = {
  execute: (query: string, bindValues?: unknown[]) => Promise<unknown>
  select: <T>(query: string, bindValues?: unknown[]) => Promise<T>
}

let dbPromise: Promise<SqlDb> | null = null

async function getDb(): Promise<SqlDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      // Lazy import: keeps plugin-sql out of the web bundle.
      const { default: Database } = await import('@tauri-apps/plugin-sql')
      const db = (await Database.load(DB_PATH)) as unknown as SqlDb
      await db.execute(TABLE_SQL)
      return db
    })()
    // Don't cache a rejected promise forever — next call retries.
    dbPromise.catch(() => { dbPromise = null })
  }
  return dbPromise
}

async function readSqlite(key: string): Promise<string | null> {
  const db = await getDb()
  const rows = await db.select<Array<{ value: string }>>(
    'SELECT value FROM kv WHERE key = ?',
    [key],
  )
  return rows.length > 0 ? rows[0].value : null
}

async function writeSqlite(key: string, value: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    [key, value],
  )
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // quota/blocked — ignore, state still lives in memory
  }
}

export const hybridStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (!isTauri()) return readLocal(key)
    try {
      const fromDb = await readSqlite(key)
      // First desktop launch: transparent one-time import from localStorage.
      if (fromDb !== null) return fromDb
      return readLocal(key)
    } catch {
      return readLocal(key)
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (!isTauri()) {
      writeLocal(key, value)
      return
    }
    try {
      await writeSqlite(key, value)
    } catch {
      writeLocal(key, value)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
    if (!isTauri()) return
    try {
      const db = await getDb()
      await db.execute('DELETE FROM kv WHERE key = ?', [key])
    } catch {
      // ignore
    }
  },
}
