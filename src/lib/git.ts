import type { FileSystemDirectoryHandleLike } from './fsTypes'

export interface GitCommit { oid:string, author:string, message:string, timestamp:number }

const MAX_HEAD_BYTES = 256 * 1024
const LOG_RE = /^([0-9a-f]{4,40}) ([0-9a-f]{4,40}) (.+?) (\d{9,12}) ([+-]\d{4})\t(.*)$/

export async function readGitHistory(handle: FileSystemDirectoryHandleLike | null | undefined): Promise<GitCommit[]> {
  try{
    if (!handle?.getDirectoryHandle) return []
    const gitHandle = await handle.getDirectoryHandle('.git').catch(()=>null)
    if(!gitHandle) return []
    const logsHandle = await gitHandle.getDirectoryHandle('logs').catch(()=>null)
    if(!logsHandle) return []
    const headFile = await logsHandle.getFileHandle('HEAD').catch(()=>null)
    if(!headFile) return []
    const file = await headFile.getFile()
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_HEAD_BYTES) return []
    const text = await file.text()
    if (!text.trim()) return []
    const lines = text.trim().split('\n').slice(-20).reverse()
    const out: GitCommit[] = []
    for (const l of lines) {
      const m = LOG_RE.exec(l)
      if(!m) continue
      const oid = m[2].slice(0,7)
      const authorRaw = m[3]
      const ts = parseInt(m[4],10)
      if (!Number.isFinite(ts)) continue
      const author = authorRaw.split('<')[0].trim() || authorRaw.split(' ')[0] || 'unknown'
      out.push({ oid, author: author.slice(0,60), message: (m[6] || 'commit').slice(0,200), timestamp: ts*1000 })
    }
    return out
  }catch{ return [] }
}

export async function readGitStatus(handle: FileSystemDirectoryHandleLike | null | undefined): Promise<{modified:number, untracked:number, branch:string}>{
  try{
    if (!handle?.getDirectoryHandle) return { modified:0, untracked:0, branch:'main' }
    const gitHandle = await handle.getDirectoryHandle('.git').catch(()=>null)
    if(!gitHandle) return { modified:0, untracked:0, branch:'main' }
    let branch='main'
    let detached = false
    try{
      const head = await gitHandle.getFileHandle('HEAD')
      const f=await head.getFile()
      if (f.size > 4096) return { modified:0, untracked:0, branch }
      const txt=await f.text()
      const m=txt.match(/ref:\s*refs\/heads\/([^\s]+)/)
      if(m) branch=m[1].trim().slice(0,80)
      else if (txt.trim()) { detached = true; branch = txt.trim().slice(0,7) }
    }catch{ /* keep main */ }
    if (detached) return { modified:0, untracked:0, branch }
    // Честно: без настоящего diff возвращаем 0, а не random
    return { modified:0, untracked:0, branch }
  }catch{ return { modified:0, untracked:0, branch:'main' } }
}

const TASK_REF_RE = /#(\d{3})\b/g
export function linkCommitsToTasks(commits: GitCommit[], tasks: {number:number, title:string}[]){
  const byNum = new Map<number, {number:number, title:string}>()
  for (const t of tasks) byNum.set(t.number, t)
  return commits.map(c=>{
    const linked: {number:number, title:string}[] = []
    TASK_REF_RE.lastIndex = 0
    let m: RegExpExecArray | null
    const msg = c.message
    while ((m = TASK_REF_RE.exec(msg)) !== null) {
      const n = parseInt(m[1],10)
      const t = byNum.get(n)
      if (t && !linked.includes(t)) linked.push(t)
    }
    return { ...c, linked }
  })
}

// Только для Tauri/Node — см. src/lib/gitNode.ts (отдельный модуль,
// чтобы isomorphic-git (~120kB) не попадал в браузерный бандл).
// Браузер использует readGitHistory (.git/logs/HEAD) выше.

