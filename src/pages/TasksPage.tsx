import { useStore } from '../store/useStore'
import { PRIORITY_META } from '../lib/constants'
import type { TaskStatus, TaskPriority } from '../lib/types'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TaskBoard } from '../components/TaskBoard'
import { useT } from '../lib/useT'

export function TasksPage(){
  const tasks = useStore(s=>s.tasks)
  const projects = useStore(s=>s.projects)
  const updateTask = useStore(s=>s.updateTask)
  const addTask = useStore(s=>s.addTask)
  const t = useT()
  const [view, setView] = useState<'board'|'list'>(()=> (localStorage.getItem('vb-tasks-view') as any) || 'board')
  const [filter, setFilter]=useState<TaskStatus|'ALL'>('ALL')
  const [projectFilter, setProjectFilter]=useState<string>('ALL')
  const [q,setQ]=useState('')
  const [showCreate, setShowCreate]=useState(false)
  const [createStatus, setCreateStatus]=useState<TaskStatus>('TODO')
  const [createProject, setCreateProject]=useState<string>(projects[0]?.id ?? '')
  const [createTitle, setCreateTitle]=useState('')
  const [createPriority, setCreatePriority]=useState<TaskPriority>('MEDIUM')

  const setViewPersist = (v:'board'|'list')=>{ localStorage.setItem('vb-tasks-view', v); setView(v)}

  const filtered = tasks.filter(ts=>{
    if(filter!=='ALL' && ts.status!==filter) return false
    if(projectFilter!=='ALL' && ts.project_id!==projectFilter) return false
    if(q && !ts.title.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }).sort((a,b)=> new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  const grouped = {
    TODO: filtered.filter(ts=>ts.status==='TODO').length,
    IN_PROGRESS: filtered.filter(ts=>ts.status==='IN_PROGRESS').length,
    REVIEW: filtered.filter(ts=>ts.status==='REVIEW').length,
    DONE: filtered.filter(ts=>ts.status==='DONE').length,
    BLOCKED: filtered.filter(ts=>ts.status==='BLOCKED').length,
  }

  const handleAddFromBoard = (status: TaskStatus)=>{
    setCreateStatus(status)
    setCreateProject(projects[0]?.id ?? '')
    setShowCreate(true)
  }

  const submitCreate = ()=>{
    if(!createTitle.trim() || !createProject) return
    addTask({ project_id: createProject, title: createTitle.trim(), status: createStatus, priority: createPriority })
    setCreateTitle('')
    setShowCreate(false)
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('tasks.title')}</h1>
          <p className="text-sm text-zinc-500">{t('tasks.subtitle')} · {tasks.length} {t('tasks.total')} · {filtered.length} {t('tasks.shown')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border overflow-hidden bg-white dark:bg-zinc-900 p-1">
            <button onClick={()=> setViewPersist('board')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view==='board'?'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900':'text-zinc-600'}`}>{t('tasks.board')}</button>
            <button onClick={()=> setViewPersist('list')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view==='list'?'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900':'text-zinc-600'}`}>{t('tasks.list')}</button>
          </div>
          <button onClick={()=>{ setCreateStatus('TODO'); setCreateProject(projects[0]?.id ?? ''); setShowCreate(true)}} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium">+ {t('tasks.addTask')}</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <select value={projectFilter} onChange={e=> setProjectFilter(e.target.value)} className="px-3 py-1.5 rounded-full border bg-white dark:bg-zinc-900 text-sm">
          <option value="ALL">{t('ideas.allProjects')}</option>
          {projects.map(p=> <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}
        </select>
        {view==='list' && (['ALL','TODO','IN_PROGRESS','REVIEW','DONE','BLOCKED'] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filter===f?'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900':'bg-white dark:bg-zinc-900'}`}>{f==='ALL'? t('projects.filterAll') : t(`taskStatus.${f}`)} {f!=='ALL'? `· ${grouped[f as keyof typeof grouped]}`:''}</button>
        ))}
        {view==='board' && (
          <span className="text-xs text-zinc-500 hidden sm:inline">{t('tasks.subtitle')}</span>
        )}
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('tasks.searchPlaceholder')} className="ml-auto px-3 py-1.5 rounded-full border bg-white dark:bg-zinc-900 text-sm w-full sm:w-64" />
      </div>

      {view==='board' ? (
        <TaskBoard tasks={filtered} showProject onAdd={handleAddFromBoard} />
      ) : (
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden">
          <div className="divide-y">
            {filtered.length===0? <div className="p-8 text-center text-sm text-zinc-500">{t('tasks.noTasks')}</div> : filtered.map(ts=>{
              const proj = projects.find(p=>p.id===ts.project_id)
              return (
                <div key={ts.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <span className="font-mono text-xs text-zinc-500">#{String(ts.number).padStart(3,'0')}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{ts.title}</div>
                    <div className="text-xs text-zinc-500 flex gap-2"><Link to={`/projects/${proj?.code}`} className="hover:underline font-mono">{proj?.code}</Link><span>{proj?.name}</span></div>
                  </div>
                  <span className={`hidden sm:inline text-xs px-2 py-1 rounded-full border ${PRIORITY_META[ts.priority].color}`}>{t(`priority.${ts.priority}`)}</span>
                  <select value={ts.status} onChange={e=> updateTask(ts.id,{status:e.target.value as TaskStatus})} className="text-xs px-2 py-1 rounded-full border bg-white dark:bg-zinc-900">
                    <option value="TODO">○ {t('taskStatus.TODO')}</option><option value="IN_PROGRESS">◐ {t('taskStatus.IN_PROGRESS')}</option><option value="REVIEW">◑ {t('taskStatus.REVIEW')}</option><option value="DONE">✓ {t('taskStatus.DONE')}</option><option value="BLOCKED">✕ {t('taskStatus.BLOCKED')}</option>
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=> setShowCreate(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 border shadow-xl">
            <h3 className="font-semibold">{t('tasks.create.title')}</h3>
            <div className="mt-4 space-y-3">
              <label className="block"><span className="text-xs font-medium">{t('tasks.create.titleLabel')}</span><input value={createTitle} onChange={e=>setCreateTitle(e.target.value)} placeholder={t('tasks.create.placeholder')} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm" /></label>
              <label className="block"><span className="text-xs font-medium">{t('sidebar.projects')}</span>
                <select value={createProject} onChange={e=> setCreateProject(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm">
                  {projects.map(p=> <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-xs font-medium">{t('tasks.create.status')}</span>
                  <select value={createStatus} onChange={e=> setCreateStatus(e.target.value as TaskStatus)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm">
                    <option value="TODO">{t('taskStatus.TODO')}</option><option value="IN_PROGRESS">{t('taskStatus.IN_PROGRESS')}</option><option value="REVIEW">{t('taskStatus.REVIEW')}</option><option value="DONE">{t('taskStatus.DONE')}</option><option value="BLOCKED">{t('taskStatus.BLOCKED')}</option>
                  </select>
                </label>
                <label className="block"><span className="text-xs font-medium">{t('tasks.create.priority')}</span>
                  <select value={createPriority} onChange={e=> setCreatePriority(e.target.value as TaskPriority)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm">
                    <option value="LOW">{t('priority.LOW')}</option><option value="MEDIUM">{t('priority.MEDIUM')}</option><option value="HIGH">{t('priority.HIGH')}</option><option value="URGENT">{t('priority.URGENT')}</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={()=> setShowCreate(false)} className="px-4 py-2 rounded-xl border text-sm">{t('common.cancel')}</button>
              <button onClick={submitCreate} className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium">{t('tasks.create.submit')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
