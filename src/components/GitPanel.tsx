import { useEffect, useState } from 'react'
import { readGitHistory, linkCommitsToTasks } from '../lib/git'
import type { Project, Task } from '../lib/types'
import type { FileSystemDirectoryHandleLike } from '../lib/fsTypes'
import { formatRelative } from '../lib/utils'

export function GitPanel({ project, tasks, handle }: {project:Project, tasks:Task[], handle?: FileSystemDirectoryHandleLike}){
  const [commits, setCommits]=useState<ReturnType<typeof linkCommitsToTasks>>([])
  const [loading, setLoading]=useState(false)

  useEffect(()=>{
    if(!handle) return
    let cancelled = false
    setLoading(true)
    readGitHistory(handle).then(cs=>{
      if (cancelled) return
      setCommits(linkCommitsToTasks(cs, tasks.map(t=>({number:t.number, title:t.title}))))
      setLoading(false)
    }).catch(()=>{ if (!cancelled) setLoading(false) })
    return ()=>{ cancelled = true }
  },[handle, tasks])

  if(!handle){
    return (
      <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
        <h3 className="font-semibold text-sm">Git — реальная история</h3>
        <div className="mt-2 text-xs text-zinc-500">Нет данных — привяжи папку через <b>📁 Добавить папку</b> (File System Access), прочитаем <code>.git/logs/HEAD</code> напрямую, без сервера.</div>
        <div className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between"><span className="text-zinc-500">Ветка</span><span className="font-mono bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded">{project.branch ?? '—'}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Последний коммит</span><span>{project.last_commit? formatRelative(project.last_commit):'—'}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Изменения</span><span>{project.changes_modified ?? '—'} модифицировано · {project.changes_untracked ?? '—'} новых</span></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-sm">Git — реальная история ({commits.length})</h3>
        {loading && <span className="text-xs text-zinc-500">чтение .git/logs/HEAD…</span>}
      </div>
      {commits.length===0 ? <div className="text-xs text-zinc-500 mt-2">Нет коммитов или .git недоступен (Tauri даст полный log).</div> : (
        <div className="mt-3 space-y-2 max-h-64 overflow-auto">
          {commits.map((c:any)=>(
            <div key={c.oid} className="flex gap-3 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700">
              <span className="font-mono text-xs text-violet-600">{c.oid}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{c.message}</div>
                <div className="text-xs text-zinc-500">{c.author} · {new Date(c.timestamp).toLocaleString()} · {formatRelative(new Date(c.timestamp).toISOString())}</div>
                {c.linked?.length>0 && <div className="text-[11px] text-emerald-600">→ задачи: {c.linked.map((t:any)=> `#${String(t.number).padStart(3,'0')}`).join(', ')}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 text-[11px] text-zinc-500">isomorphic-git готов для Tauri (Node fs). В браузере — парсинг .git/logs/HEAD.</div>
    </div>
  )
}
