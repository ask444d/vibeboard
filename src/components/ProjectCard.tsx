import { Link } from 'react-router-dom'
import type { Project, Task } from '../lib/types'
import { PROJECT_STATUS_META } from '../lib/constants'
import { LanguageBar } from './ui/LanguageBar'
import { getNextTask, formatRelative } from '../lib/utils'
import { computeHealth } from '../lib/health'
import { hasHandle, isWatching, watchProject, unwatchProject } from '../lib/watch'
import { useStore } from '../store/useStore'
import { useState, useEffect } from 'react'

const TYPE_DOT: Record<string,string> = {
  WEB:'bg-blue-500',
  APP:'bg-emerald-500',
  GAME:'bg-violet-500',
  BOT:'bg-orange-500',
  AI:'bg-cyan-500',
  TOOL:'bg-zinc-500',
  OTHER:'bg-zinc-400',
}

export function ProjectCard({ project, tasks }: {project:Project, tasks:Task[]}){
  const meta = PROJECT_STATUS_META[project.status]
  const next = getNextTask(tasks)
  const health = computeHealth(project, tasks)
  const updateProject = useStore(s=>s.updateProject)
  const [live, setLive]=useState(()=> isWatching(project.id))
  const hasH = hasHandle(project.id)
  useEffect(()=>{ setLive(isWatching(project.id)) },[project.id])
  const toggleLive = ()=>{
    if(isWatching(project.id)){
      unwatchProject(project.id); setLive(false)
    } else if(hasH){
      watchProject(project, patch=> updateProject(project.id, patch as any))
      setLive(true)
    } else {
      alert('Нет handle — добавь проект через 📁 Добавить папку (File System Access) чтобы включить Live watch')
    }
  }
  return (
    <div className="group bg-white dark:bg-zinc-900 border rounded-2xl p-5 card-hover flex flex-col">
      {/* header — группа левее статуса, в один ряд */}
      <div className="flex items-start gap-3">
        <Link to={`/projects/${project.code}`} className="flex-1 min-w-0">
          <div className="font-mono text-xs tracking-widest text-zinc-500">{project.code}</div>
          <div className="font-semibold text-base mt-0.5 group-hover:text-violet-600 transition-colors truncate">{project.name}</div>
          <div className="text-xs text-zinc-500 line-clamp-1">{project.description || '—'}</div>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-white dark:bg-zinc-800 shadow-sm">
            <span className={`w-2 h-2 rounded-full ${TYPE_DOT[project.type]}`} />{project.type}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800 border">
            <span className={`w-2 h-2 rounded-full ${meta.dot}`} />{meta.label}
          </span>
        </div>
      </div>

      <Link to={`/projects/${project.code}`} className="block">
        <div className="mt-4">
          <LanguageBar languages={project.languages} compact />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-500">Progress</span><span className="font-medium">{project.progress}%</span>
          </div>
          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width:`${project.progress}%`, background:'linear-gradient(90deg,#7c3aed,#4f46e5)' }} />
          </div>
        </div>

        {next ? (
          <div className="mt-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-dashed px-3 py-2.5 flex items-center gap-2">
            <span className="text-xs text-zinc-500">Next:</span>
            <span className="text-sm font-medium truncate">#{String(next.number).padStart(3,'0')} {next.title}</span>
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border">{next.status}</span>
          </div>
        ):(
          <div className="mt-4 text-xs text-zinc-400">No pending tasks — add the next action</div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex gap-1 flex-wrap">
            {project.technologies.slice(0,3).map(t=> <span key={t} className="px-1.5 py-0.5 rounded bg-zinc-50 dark:bg-zinc-800 border text-[11px]">{t}</span>)}
          </span>
          <span>Updated {formatRelative(project.updated_at)}</span>
        </div>
      </Link>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{width:`${health.score}%`, background: health.color.includes('emerald')?'#10b981': health.color.includes('red')?'#ef4444': health.color.includes('amber')?'#f59e0b':'#eab308'}}/>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium ${health.color}`}>{health.score}%</span>
        <button onClick={e=>{e.preventDefault(); e.stopPropagation(); toggleLive()}} className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${live?'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30':'bg-white dark:bg-zinc-800 text-zinc-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${live?'bg-emerald-500 animate-pulse':'bg-zinc-400'}`} />{live?'Live':'Watch'}
        </button>
      </div>
      {!hasH && <div className="text-[10px] text-zinc-400 mt-1">Добавь через 📁 чтобы включить Live (FileSystemObserver + polling)</div>}
    </div>
  )
}
