import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Task, TaskStatus, TaskPriority } from '../lib/types'
import { PRIORITY_META } from '../lib/constants'
import { useStore } from '../store/useStore'
import { useT } from '../lib/useT'

type Column = { key: TaskStatus, icon: string, tint: string }

const COLUMNS: Column[] = [
  { key:'TODO', icon:'○', tint:'bg-zinc-100 dark:bg-zinc-800' },
  { key:'IN_PROGRESS', icon:'◐', tint:'bg-amber-50 dark:bg-amber-950/30' },
  { key:'REVIEW', icon:'◑', tint:'bg-blue-50 dark:bg-blue-950/30' },
  { key:'DONE', icon:'✓', tint:'bg-emerald-50 dark:bg-emerald-950/30' },
  { key:'BLOCKED', icon:'✕', tint:'bg-red-50 dark:bg-red-950/30' },
]

const PRIORITY_DOT: Record<TaskPriority,string> = {
  LOW:'bg-zinc-400',
  MEDIUM:'bg-blue-500',
  HIGH:'bg-amber-500',
  URGENT:'bg-red-500',
}
const PRIORITY_LABEL_KEY: Record<TaskPriority,string> = {
  LOW:'tasks.card.priorityLow',
  MEDIUM:'tasks.card.priorityMedium',
  HIGH:'tasks.card.priorityHigh',
  URGENT:'tasks.card.priorityUrgent',
}

export function TaskBoard({
  tasks,
  projectId: _projectId,
  showProject = false,
  onAdd,
  highlightId,
}: {
  tasks: Task[]
  projectId?: string
  showProject?: boolean
  onAdd?: (status: TaskStatus)=>void
  highlightId?: string
}){
  const updateTask = useStore(s=>s.updateTask)
  const deleteTask = useStore(s=>s.deleteTask)
  const projects = useStore(s=>s.projects)
  const t = useT()
  const [dragId, setDragId] = useState<string|null>(null)
  const [dragOver, setDragOver] = useState<TaskStatus|null>(null)

  const handleDrop = (status: TaskStatus)=>{
    if(dragId){
      updateTask(dragId, {status})
    }
    setDragId(null)
    setDragOver(null)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none" style={{scrollbarWidth:'thin'}}>
      {COLUMNS.map(col=>{
        const colTasks = tasks.filter(ts=> ts.status===col.key)
        const labelKey = `tasks.column.${col.key==='TODO'?'todo': col.key==='IN_PROGRESS'?'inProgress': col.key==='REVIEW'?'review': col.key==='DONE'?'done': col.key==='BLOCKED'?'blocked':'cancelled'}`
        // fallback mapping
        const label = t(labelKey) !== labelKey ? t(labelKey) : (
          col.key==='TODO'? t('tasks.column.todo'):
          col.key==='IN_PROGRESS'? t('tasks.column.inProgress'):
          col.key==='REVIEW'? t('tasks.column.review'):
          col.key==='DONE'? t('tasks.column.done'):
          col.key==='BLOCKED'? t('tasks.column.blocked'): col.key
        )
        const isOver = dragOver===col.key
        return (
          <div
            key={col.key}
            onDragOver={e=>{ e.preventDefault(); setDragOver(col.key)}}
            onDragLeave={()=> setDragOver(null)}
            onDrop={()=> handleDrop(col.key)}
            className={`shrink-0 snap-start w-[84vw] max-w-[320px] sm:w-[300px] sm:max-w-none rounded-2xl border flex flex-col max-h-[70vh] sm:max-h-[72vh] ${isOver?'ring-2 ring-violet-500 ring-offset-1 dark:ring-offset-zinc-900':''} ${col.tint}`}
          >
            <div className="sticky top-0 p-3 flex items-center gap-2 border-b bg-white/60 dark:bg-zinc-900/40 backdrop-blur rounded-t-2xl">
              <span className="text-sm">{col.icon}</span>
              <span className="text-xs font-semibold tracking-widest uppercase">{label}</span>
              <span className="ml-auto text-xs bg-white dark:bg-zinc-800 border px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
              {colTasks.length===0 ? (
                <div className={`h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-xs transition-colors ${isOver ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/20 text-violet-600' : 'border-zinc-300 dark:border-zinc-600 bg-white/50 dark:bg-zinc-800/30 text-zinc-400'}`}>
                  {isOver ? 'Drop here' : '—'}
                </div>
              ) : (
                <>
                  {colTasks.map(task=>{
                    const proj = showProject ? projects.find(p=>p.id===task.project_id) : null
                    return (
                      <div
                        key={task.id}
                        id={`focus-${task.id}`}
                        draggable
                        onDragStart={()=> setDragId(task.id)}
                        onDragEnd={()=> { setDragId(null); setDragOver(null)}}
                        className={`group bg-white dark:bg-zinc-900 border rounded-xl p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow scroll-mt-24 ${dragId===task.id?'opacity-50 rotate-1':''} ${highlightId===task.id?'ring-2 ring-violet-500 shadow-lg':''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[11px] text-zinc-500">#{String(task.number).padStart(3,'0')}</span>
                          <span className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`} title={t(PRIORITY_LABEL_KEY[task.priority])} />
                            <span className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded font-medium border ${PRIORITY_META[task.priority].color}`}>{t(PRIORITY_LABEL_KEY[task.priority])}</span>
                          </span>
                        </div>
                        <div className="mt-1 text-sm font-medium leading-snug line-clamp-2">{task.title}</div>
                        {task.description && <div className="mt-1 text-xs text-zinc-500 line-clamp-2">{task.description}</div>}
                        {showProject && proj && (
                          <Link to={`/projects/${proj.code}`} className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-50 dark:bg-zinc-800 border hover:bg-zinc-100">
                            {proj.code} <span className="truncate max-w-[80px]">{proj.name}</span>
                          </Link>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-zinc-500">{new Date(task.updated_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=> deleteTask(task.id)} className="w-6 h-6 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500 text-xs">✕</button>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-1">
                          {COLUMNS.filter(c=>c.key!==task.status).slice(0,3).map(c=>(
                            <button key={c.key} onClick={()=> updateTask(task.id, {status:c.key})} className="text-[11px] px-1.5 py-0.5 rounded-full border bg-zinc-50 dark:bg-zinc-800 hover:bg-white text-zinc-600 dark:text-zinc-400">
                              → {c.key==='IN_PROGRESS'? 'In Progress' : c.key==='TODO'? 'Todo' : c.key}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  <div className={`h-12 border-2 border-dashed rounded-xl flex items-center justify-center text-xs transition-colors ${isOver ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/20 text-violet-600' : 'border-zinc-300/70 dark:border-zinc-600/50 bg-white/30 dark:bg-zinc-800/20 text-zinc-400'}`}>
                    {isOver ? 'Drop here' : '+'}
                  </div>
                </>
              )}
            </div>

            <div className="p-2 border-t bg-white/40 dark:bg-zinc-900/20 rounded-b-2xl">
              <button onClick={()=> onAdd?.(col.key)} className="w-full py-1.5 rounded-xl border border-dashed bg-white dark:bg-zinc-900 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">
                + {t('common.add')}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

