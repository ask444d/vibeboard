import { analyzeLanguages, analyzeLanguagesFromHandle } from './utils'
import type { Project } from './types'
import type { FileSystemDirectoryHandleLike } from './fsTypes'

export const WATCH_POLL_MS = 10000
const SKIP_PARTS = new Set(['node_modules','.git','dist','build'])

const handles = new Map<string, FileSystemDirectoryHandleLike>()
const observers = new Map<string, { disconnect(): void }>()
const pollers = new Map<string, number>()
let dbPromise: Promise<IDBDatabase> | null = null

function getDb(): Promise<IDBDatabase> | null {
  try {
    if (typeof indexedDB === 'undefined') return null
    if (!dbPromise) {
      dbPromise = new Promise((res, rej) => {
        const req = indexedDB.open('vibeboard-handles', 1)
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('handles')) req.result.createObjectStore('handles')
        }
        req.onsuccess = () => res(req.result)
        req.onerror = () => rej(req.error)
      })
    }
    return dbPromise
  } catch { return null }
}

export function registerHandle(projectId:string, handle: FileSystemDirectoryHandleLike | null | undefined){
  if(!handle) return
  handles.set(projectId, handle)
  const db = getDb()
  if (!db) return
  db.then((d) => {
    try {
      const tx = d.transaction('handles','readwrite')
      tx.objectStore('handles').put(handle, projectId)
    } catch { /* best-effort */ }
  }).catch(()=>{})
}

export async function loadPersistedHandles(): Promise<Map<string,FileSystemDirectoryHandleLike>>{
  const empty = new Map<string,FileSystemDirectoryHandleLike>()
  const db = getDb()
  if (!db) return empty
  try {
    const d = await db
    if(!d.objectStoreNames.contains('handles')) return empty
    return await new Promise((res) => {
      try {
        const all = new Map<string,FileSystemDirectoryHandleLike>()
        const tx = d.transaction('handles','readonly')
        const store = tx.objectStore('handles')
        const cursor = store.openCursor()
        cursor.onsuccess = ()=>{
          const cur = cursor.result as IDBCursorWithValue | null
          if(cur){ all.set(String(cur.key), cur.value as FileSystemDirectoryHandleLike); cur.continue() }
          else { for (const [k,v] of all) handles.set(k,v); res(all) }
        }
        cursor.onerror = ()=> res(empty)
      } catch { res(empty) }
    })
  } catch { return empty }
}

// FNV-1a по всей строке — без обрезки, изменения в глубоких файлах видны
function hashFiles(files: {path:string;bytes:number}[]): string {
  let h = 0x811c9dc5
  for (const f of files) {
    const s = `${f.path}:${f.bytes};`
    for (let i=0;i<s.length;i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  }
  return (h >>> 0).toString(36)
}

function debounce<T extends unknown[]>(fn:(...a:T)=>void, ms:number){
  let id = 0
  return (...a:T) => { window.clearTimeout(id); id = window.setTimeout(()=> fn(...a), ms) }
}

export function watchProject(
  project: Project,
  onChange: (patch: Partial<Project>)=>void,
  onError?: (e: unknown)=>void
){
  const handle = handles.get(project.id)
  if(!handle) return ()=>{}

  const refresh = async () => {
    try{
      const vfiles = await analyzeLanguagesFromHandle(handle)
      if(vfiles.length){
        const langs = analyzeLanguages(vfiles)
        onChange({ languages: langs.map(l=> ({...l, project_id: project.id})), updated_at: new Date().toISOString() })
      } else {
        onChange({ updated_at: new Date().toISOString() })
      }
    }catch(e){ onError?.(e) }
  }
  const debounced = debounce(refresh, 300)

  const Observer = (window as unknown as { FileSystemObserver?: new (cb:(r: Array<{relativePathComponents?: string[]}>)=>void)=>{ observe(h: unknown, o: unknown): void; disconnect(): void } }).FileSystemObserver
  if(Observer){
    try{
      const obs = new Observer((records)=>{
        for(const r of records){
          if(r.relativePathComponents?.some((p)=> SKIP_PARTS.has(p))) continue
          debounced()
          return
        }
      })
      obs.observe(handle, { recursive: true })
      observers.set(project.id, obs)
      return ()=>{ try{ obs.disconnect() }catch{}; observers.delete(project.id) }
    }catch(e){ onError?.(e) }
  }

  let lastHash = ''
  let stopped = false
  const tick = async ()=>{
    if (stopped) return
    try{
      const vfiles = await analyzeLanguagesFromHandle(handle)
      const hash = hashFiles(vfiles)
      if(hash !== lastHash){
        lastHash = hash
        if(vfiles.length){
          const langs = analyzeLanguages(vfiles)
          onChange({ languages: langs.map(l=> ({...l, project_id: project.id})), updated_at: new Date().toISOString() })
        }
      }
    }catch(e){ onError?.(e) }
  }
  void tick()
  const interval = window.setInterval(tick, WATCH_POLL_MS)
  pollers.set(project.id, interval)
  return ()=>{ stopped = true; clearInterval(interval); pollers.delete(project.id) }
}

export function unwatchProject(projectId:string){
  const obs = observers.get(projectId)
  if(obs) try{ obs.disconnect() }catch{}
  observers.delete(projectId)
  const poll = pollers.get(projectId)
  if(poll !== undefined) clearInterval(poll)
  pollers.delete(projectId)
}

export function isWatching(projectId:string){
  return observers.has(projectId) || pollers.has(projectId)
}
export function hasHandle(projectId:string){
  return handles.has(projectId)
}
