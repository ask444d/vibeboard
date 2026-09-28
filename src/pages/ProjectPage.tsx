import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { LanguageBar } from '../components/ui/LanguageBar'
import { PROJECT_STATUS_META, TASK_STATUS_META } from '../lib/constants'
import { getNextTask, formatRelative } from '../lib/utils'
import type { TaskStatus, TaskPriority, ProjectStatus } from '../lib/types'
import { useState, useEffect } from 'react'
import { TaskBoard } from '../components/TaskBoard'
import { IdeaBoard } from '../components/IdeaBoard'
import { IdeaModal } from '../components/IdeaModal'
import { useT } from '../lib/useT'
import { computeHealth, healthLabelRu } from '../lib/health'
import { GitPanel } from '../components/GitPanel'
import { AgentSendButtons } from '../components/AgentSendButtons'
import { hasHandle, isWatching, watchProject, unwatchProject } from '../lib/watch'

export function ProjectPage(){
  const { code } = useParams()
  const navigate = useNavigate()
  const projects = useStore(s=>s.projects)
  const tasks = useStore(s=>s.tasks)
  const ideas = useStore(s=>s.ideas)
  const notes = useStore(s=>s.notes)
  const sessions = useStore(s=>s.sessions)
  const activities = useStore(s=>s.activities)
  const updateProject = useStore(s=>s.updateProject)
  const deleteProject = useStore(s=>s.deleteProject)
  const updateTask = useStore(s=>s.updateTask)
  const addNote = useStore(s=>s.addNote)
  const updateNote = useStore(s=>s.updateNote)
  const deleteNote = useStore(s=>s.deleteNote)
  const addSession = useStore(s=>s.addSession)
  const endSession = useStore(s=>s.endSession)
  const t = useT()

  const project = projects.find(p=>p.code===code)
  const [searchParams] = useSearchParams()
  const tabs = ['overview','tasks','ideas','notes','sessions','activity'] as const
  const initialTab = searchParams.get('tab')
  const [activeTab, setActiveTab]=useState<typeof tabs[number]>(tabs.includes(initialTab as any) ? initialTab as typeof tabs[number] : 'overview')
  const focusId = searchParams.get('focus') ?? undefined
  useEffect(()=>{
    if(!focusId) return
    const t = setTimeout(()=>{
      document.getElementById(`focus-${focusId}`)?.scrollIntoView({ behavior:'smooth', block:'center' })
    }, 150)
    return ()=> clearTimeout(t)
  },[focusId, activeTab])
  const [showTaskModal, setShowTaskModal]=useState(false)
  const [editingNote, setEditingNote]=useState<string|null>(null)
  const [noteDraft, setNoteDraft]=useState('')
  const [sessionGoal, setSessionGoal]=useState('')
  const [live, setLive]=useState(()=> project ? isWatching(project.id) : false)

  if(!project){
    return <div className="p-8 text-center"><div className="text-lg font-semibold">{t('project.notFound')}</div><Link to="/projects" className="text-violet-600 text-sm">{t('project.backToProjects')}</Link></div>
  }
  const projTasks = tasks.filter(t=>t.project_id===project.id)
  const projIdeas = ideas.filter(i=>i.project_id===project.id)
  const projNotes = notes.filter(n=>n.project_id===project.id)
  const projSessions = sessions.filter(s=>s.project_id===project.id)
  const projActivities = activities.filter(a=>a.project_id===project.id)
  const next = getNextTask(projTasks)
  const done = projTasks.filter(t=>t.status==='DONE').length
  const blocked = projTasks.filter(t=>t.status==='BLOCKED').length
  const health = computeHealth(project, projTasks)
  const hasH = hasHandle(project.id)
  const stats = [
    {label:t('project.stats.progress'), value:`${project.progress}%`},
    {label:t('project.stats.tasks'), value: String(projTasks.length)},
    {label:t('project.stats.done'), value: String(done)},
    {label:t('project.stats.blocked'), value: String(blocked)},
    {label:'Health', value:`${health.score}%`},
  ]

  return (
    <div className="space-y-5 animate-in">
      <Link to="/projects" className="text-sm text-zinc-500 hover:text-zinc-700">{t('project.back')}</Link>

      <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6">
        <div className="flex flex-wrap gap-4 items-start justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xs tracking-widest text-zinc-500">{project.code}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border">{PROJECT_STATUS_META[project.status].icon} {PROJECT_STATUS_META[project.status].label}</span>
              <label className="relative inline-flex items-center">
                <span className={`pointer-events-none absolute left-2 w-2 h-2 rounded-full ${project.type==='WEB'?'bg-blue-500':project.type==='APP'?'bg-emerald-500':project.type==='GAME'?'bg-violet-500':project.type==='BOT'?'bg-orange-500':project.type==='AI'?'bg-cyan-500':project.type==='TOOL'?'bg-zinc-500':'bg-zinc-400'}`} />
                <select
                  value={project.type}
                  onChange={e=>{
                    const newType = e.target.value as import('../lib/types').ProjectType
                    const num = project.code.split('-')[1] ?? '001'
                    const desired = `${newType}-${num}`
                    const exists = useStore.getState().projects.some(p=> p.code===desired && p.id!==project.id)
                    const newCode = exists ? (()=>{ const st=useStore.getState().projects; const nums=st.filter(p=>p.code.startsWith(newType+'-')).map(p=> parseInt(p.code.split('-')[1]||'0',10)); const next=Math.max(0,...nums)+1; return `${newType}-${String(next).padStart(3,'0')}` })() : desired
                    updateProject(project.id, { type: newType, code: newCode } as any)
                  }}
                  className="appearance-none pl-6 pr-7 py-1 rounded-full border bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors"
                  title="Сменить группу"
                >
                  <option value="WEB">WEB</option>
                  <option value="APP">APP</option>
                  <option value="GAME">GAME</option>
                  <option value="BOT">BOT</option>
                  <option value="AI">AI</option>
                  <option value="TOOL">TOOL</option>
                  <option value="OTHER">OTHER</option>
                </select>
                <span className="pointer-events-none absolute right-2 text-zinc-400 text-[10px]">▾</span>
              </label>
            </div>
            <h1 className="text-2xl font-bold mt-2">{project.name}</h1>
            <p className="text-sm text-zinc-500 mt-1 max-w-xl">{project.description || 'No description'}</p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={()=>{
                if(isWatching(project.id)){ unwatchProject(project.id); setLive(false) }
                else if(hasH){ watchProject(project, patch=> updateProject(project.id, patch as any)); setLive(true) }
                else alert('Нет handle — добавь через 📁 Добавить папку чтобы включить Live')
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 ${live?'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30':'bg-white dark:bg-zinc-800'}`}
              title={live?'Live: FileSystemObserver + polling 10s':'Включить Live watch'}
            >
              <span className={`w-2 h-2 rounded-full ${live?'bg-emerald-500 animate-pulse':'bg-zinc-400'}`} />{live?'● Live':'○ Watch'}
            </button>
            <select value={project.status} onChange={e=> updateProject(project.id, {status: e.target.value as ProjectStatus})} className="px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm">
              <option value="PLANNING">🔵 {t('status.PLANNING')}</option><option value="ACTIVE">🟢 {t('status.ACTIVE')}</option><option value="PAUSED">⚪ {t('status.PAUSED')}</option><option value="BLOCKED">🔴 {t('status.BLOCKED')}</option><option value="TESTING">🟣 {t('status.TESTING')}</option><option value="COMPLETED">✅ {t('status.COMPLETED')}</option><option value="ARCHIVED">🗃️ {t('status.ARCHIVED')}</option>
            </select>
            <button onClick={()=>{
              const json = useStore.getState().exportProject(project.id)
              if(!json) return
              const blob = new Blob([json], {type:'application/json'})
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `${project.code}-${project.name}.vibeboard.json`
              a.click(); URL.revokeObjectURL(url)
            }} className="px-3 py-2 rounded-xl border text-sm" title={t('project.export')}>⬇ {t('project.export')}</button>
            <label className="px-3 py-2 rounded-xl border text-sm cursor-pointer" title={t('project.import')}>⬆ {t('project.import')}
              <input type="file" accept="application/json,.json" className="hidden" onChange={async e=>{
                const file = e.target.files?.[0]
                e.target.value = ''
                if(!file) return
                const text = await file.text()
                const res = useStore.getState().importProject(text)
                if(res.ok && res.code){ alert(t('project.importOk')); navigate(`/projects/${res.code}`) }
                else alert(t('project.importError'))
              }} />
            </label>
            <button onClick={()=>{ if(confirm('Delete project?')){ deleteProject(project.id); navigate('/projects')}}} className="px-3 py-2 rounded-xl border text-sm hover:bg-red-50 dark:hover:bg-red-900/20">{t('common.delete')}</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          {stats.map(s=> (
            <div key={s.label} className={`rounded-xl p-3 ${s.label==='Health' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-50 dark:bg-zinc-800'}`}>
              <div className={`text-xs ${s.label==='Health' ? 'opacity-70' : 'text-zinc-500'}`}>{s.label}</div>
              <div className="text-xl font-bold">{s.value}</div>
              {s.label==='Health' && <div className="text-[11px] opacity-70">{healthLabelRu(health.labelKey)} · {health.details}</div>}
            </div>
          ))}
        </div>
        <div className="mt-3 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${health.score}%`, background: health.color.includes('emerald')?'#10b981': health.color.includes('red')?'#ef4444':'#f59e0b'}}/></div>

        {next && (
          <div className="mt-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 flex items-center gap-3">
            <span className="text-xs tracking-widest font-semibold opacity-80">{t('project.nextAction')}</span>
            <span className="font-medium">→ #{String(next.number).padStart(3,'0')} {next.title}</span>
            <button onClick={()=> updateTask(next.id, {status:'DONE'})} className="ml-auto text-xs bg-white text-violet-700 px-3 py-1.5 rounded-full font-medium">{t('project.markDone')}</button>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['overview','tasks','ideas','notes','sessions','activity'] as const).map(tab=> (
          <button key={tab} onClick={()=> setActiveTab(tab)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border ${activeTab===tab?'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900':'bg-white dark:bg-zinc-900'}`}>{t(`project.tabs.${tab}`)}</button>
        ))}
      </div>

      {activeTab==='overview' && (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
              <h3 className="font-semibold">{t('project.languages')}</h3>
              <div className="mt-3"><LanguageBar languages={project.languages} /></div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
              <h3 className="font-semibold">{t('project.techStack')}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.technologies.length? project.technologies.map(tt=> <span key={tt} className="px-3 py-1.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border text-sm">{tt}</span>) : <span className="text-sm text-zinc-500">{t('project.noStack')}</span>}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t('project.tasks')}</h3>
                <button onClick={()=>setShowTaskModal(true)} className="text-sm px-3 py-1.5 rounded-full bg-violet-600 text-white">+ Task</button>
              </div>
              <div className="mt-3 divide-y">
                {projTasks.length===0? <div className="text-sm text-zinc-500 py-4">{t('project.noTasks')}</div> : projTasks.slice(0,6).map(tt=> (
                  <div key={tt.id} className="flex items-center gap-3 py-2.5">
                    <span className="font-mono text-xs text-zinc-500">#{String(tt.number).padStart(3,'0')}</span>
                    <span className="flex-1 text-sm truncate">{tt.title}</span>
                    <span className={`text-xs ${TASK_STATUS_META[tt.status].cls}`}>{TASK_STATUS_META[tt.status].icon} {t(`taskStatus.${tt.status}`)}</span>
                  </div>
                ))}
              </div>
              {projTasks.length>6 && <button onClick={()=>setActiveTab('tasks')} className="mt-2 text-sm text-violet-600">{t('project.viewAllTasks')} {projTasks.length} →</button>}
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
              <h3 className="font-semibold text-sm">{t('project.location')}</h3>
              <div className="mt-2 font-mono text-xs bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2 break-all">{project.local_path}/</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={()=> navigator.clipboard.writeText(project.local_path)} className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">{t('project.copyPath')}</button>
                <a href={`vscode://file/${project.local_path}`} className="px-3 py-2 rounded-xl border text-xs font-medium text-center hover:bg-zinc-50">{t('project.openVSCode')}</a>
                <button onClick={async()=>{
                  const { tauriOpen } = await import('../lib/tauri')
                  if(!(await tauriOpen(project.local_path))){
                    alert(`В Tauri откроется Finder/Explorer: ${project.local_path}\nВ браузере — sandbox, только копирование пути.`)
                  }
                }} className="px-3 py-2 rounded-xl border text-xs">{t('project.openFolder')}</button>
                <button onClick={async()=>{
                  const { tauriOpenTerminal } = await import('../lib/tauri')
                  if(!(await tauriOpenTerminal(project.local_path))){
                    alert('Open terminal at '+project.local_path + ' (Tauri даст нативный shell)')
                  }
                }} className="px-3 py-2 rounded-xl border text-xs">{t('project.openTerminal')}</button>
              </div>
            </div>

            <GitPanel project={project} tasks={projTasks} handle={(project as any).__handle} />

            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
              <h3 className="font-semibold text-sm">Шаринг — экспорт/импорт (пункт 5)</h3>
              <p className="text-xs text-zinc-500 mt-1">Файл <code>.vibeboard.json</code> в корне проекта — шарится через Git, переносит тип/статус/код.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={()=>{
                  const data = { name: project.name, type: project.type, status: project.status, code: project.code, description: project.description, local_path: project.local_path }
                  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='.vibeboard.json'; a.click(); URL.revokeObjectURL(url)
                }} className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-zinc-50">Скачать .vibeboard.json</button>
                <label className="px-3 py-2 rounded-xl border text-xs font-medium hover:bg-zinc-50 text-center cursor-pointer">
                  Импорт .vibeboard.json
                  <input type="file" accept=".json" className="hidden" onChange={async e=>{
                    const f=e.target.files?.[0]; if(!f) return
                    try{
                      const txt=await f.text(); const data=JSON.parse(txt)
                      const patch:any={}
                      if(data.name) patch.name=data.name
                      if(data.type) patch.type=data.type
                      if(data.status) patch.status=data.status
                      if(data.description) patch.description=data.description
                      if(data.code) patch.code=data.code
                      updateProject(project.id, patch)
                      alert('Импортировано из .vibeboard.json')
                    }catch{ alert('Неверный JSON') }
                    e.target.value=''
                  }} />
                </label>
                <button onClick={()=>{
                  const bundle = { project, tasks: projTasks, ideas: projIdeas, notes: projNotes, sessions: projSessions }
                  const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${project.code}-${project.name}.vibeboard-bundle.json`; a.click(); URL.revokeObjectURL(url)
                }} className="px-3 py-2 rounded-xl border text-xs">Экспорт bundle</button>
                <label className="px-3 py-2 rounded-xl border text-xs text-center cursor-pointer hover:bg-zinc-50">
                  Импорт bundle
                  <input type="file" accept=".json" className="hidden" onChange={async e=>{
                    const f=e.target.files?.[0]; if(!f) return
                    try{
                      const txt=await f.text(); const data=JSON.parse(txt)
                      if(data.project?.name) updateProject(project.id, { name: data.project.name, description: data.project.description } as any)
                      if(Array.isArray(data.tasks)){
                        const addTask = useStore.getState().addTask
                        for(const t of data.tasks){ if(!projTasks.some(x=> x.title===t.title)) addTask({ project_id: project.id, title: t.title, description: t.description, status: t.status, priority: t.priority }) }
                      }
                      alert('Bundle импортирован (задачи добавлены)')
                    }catch{ alert('Ошибка bundle')}
                    e.target.value=''
                  }} />
                </label>
              </div>
              <div className="mt-2 text-[11px] text-zinc-500">Tauri: <code>fs.writeFile</code> прямо в папку проекта. Браузер: скачай и положи вручную.</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
              <h3 className="font-semibold text-sm">{t('project.progress')}</h3>
              <div className="mt-3 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-violet-600 rounded-full" style={{width:`${project.progress}%`}}/></div>
              <div className="mt-2 text-xs text-zinc-500">{done} / {projTasks.length} {t('project.tasksCompleted')}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab==='tasks' && (
        <TasksTab projectId={project.id} tasks={projTasks} onAdd={()=>setShowTaskModal(true)} highlightId={focusId} />
      )}

      {activeTab==='ideas' && (
        <IdeasTab projectId={project.id} ideas={projIdeas} highlightId={focusId} />
      )}

      {activeTab==='notes' && (
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
          <h3 className="font-semibold">Notes</h3>
          <div className="mt-3">
            <textarea value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} placeholder="Write a note… Consider SQLite for local-first version." rows={3} className="w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm" />
            <button onClick={()=>{ if(noteDraft.trim()){ addNote(project.id, noteDraft.trim()); setNoteDraft('')}}} className="mt-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm">Add note</button>
          </div>
          <div className="mt-4 space-y-3">
            {projNotes.length===0? <div className="text-sm text-zinc-500">No notes</div> : projNotes.map(n=>(
              <div key={n.id} id={`focus-${n.id}`} className={`p-3 rounded-xl border bg-zinc-50 dark:bg-zinc-800 scroll-mt-24 transition-shadow ${focusId===n.id?'ring-2 ring-violet-500 shadow-lg':''}`}>
                {editingNote===n.id? (
                  <><textarea value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} rows={3} className="w-full px-2 py-1 rounded border text-sm bg-white dark:bg-zinc-900" /><div className="mt-2 flex gap-2"><button onClick={()=>{ updateNote(n.id, noteDraft); setEditingNote(null); setNoteDraft('')}} className="text-xs px-3 py-1 rounded bg-violet-600 text-white">Save</button><button onClick={()=>setEditingNote(null)} className="text-xs px-3 py-1 rounded border">Cancel</button></div></>
                ):(
                  <>
                    <div className="text-sm whitespace-pre-wrap">{n.content}</div>
                    <div className="mt-2 flex gap-2 text-xs text-zinc-500"><span>{formatRelative(n.updated_at)}</span><button onClick={()=>{ setEditingNote(n.id); setNoteDraft(n.content)}} className="ml-auto hover:underline">Edit</button><button onClick={()=>deleteNote(n.id)} className="hover:text-red-600">Delete</button></div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==='sessions' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
            <h3 className="font-semibold">Development Sessions — таймер, пауза, лог</h3>
            <p className="text-xs text-zinc-500">Live таймер, пауза, лог заметок. Задачи, закрытые во время сессии, линкуются автоматически.</p>
            <div className="mt-3 flex gap-2">
              <input value={sessionGoal} onChange={e=>setSessionGoal(e.target.value)} placeholder="Goal: Finish project creation" className="flex-1 px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm" onKeyDown={e=>{ if(e.key==='Enter' && sessionGoal.trim()){ addSession(project.id, sessionGoal.trim()); setSessionGoal('')}}} />
              <button onClick={()=>{ if(sessionGoal.trim()){ addSession(project.id, sessionGoal.trim()); setSessionGoal('')}}} className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm">Start</button>
            </div>
          </div>
          {projSessions.length===0? <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-8 text-center text-sm text-zinc-500">Нет сессий. Начни первую — Live таймер появится здесь.</div> : projSessions.slice().sort((a,b)=> new Date(b.started_at).getTime()- new Date(a.started_at).getTime()).map(s=>{
            const isLive = !s.ended_at
            const duration = (()=>{
              const start=new Date(s.started_at).getTime()
              const end=s.ended_at? new Date(s.ended_at).getTime(): Date.now()
              const paused = s.paused_ms ?? 0 + (s.is_paused && s.paused_at ? Date.now()- new Date(s.paused_at).getTime():0)
              const ms=Math.max(0, end-start-paused)
              const mins=Math.floor(ms/60000); const hrs=Math.floor(mins/60)
              return hrs>0? `${hrs}h ${mins%60}m` : `${mins}m`
            })()
            return (
              <div key={s.id} className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">SESSION {s.id.slice(-4).toUpperCase()} · {s.goal} {isLive && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">LIVE</span>} {s.is_paused && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500 text-white">PAUSED</span>}</div>
                    <div className="text-xs text-zinc-500">{formatRelative(s.started_at)} · {duration} {s.is_paused?'· пауза':''}</div>
                  </div>
                  <div className="flex gap-2">
                    {isLive && <button onClick={()=> useStore.getState().togglePauseSession(s.id)} className={`text-xs px-3 py-1.5 rounded-full border ${s.is_paused?'bg-amber-500 text-white':'bg-white dark:bg-zinc-800'}`}>{s.is_paused?'Resume':'Pause'}</button>}
                    {isLive && <button onClick={()=>{ const sum=prompt('Summary?')||''; endSession(s.id, sum)}} className="text-xs px-3 py-1.5 rounded-full bg-violet-600 text-white">End</button>}
                  </div>
                </div>
                {isLive && (
                  <div className="mt-3 flex gap-2">
                    <input id={`note-${s.id}`} placeholder="Лог… что сделал" className="flex-1 px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm" onKeyDown={e=>{
                      if(e.key==='Enter'){
                        const inp=e.target as HTMLInputElement
                        if(inp.value.trim()){ useStore.getState().appendSessionNote(s.id, `[${new Date().toLocaleTimeString()}] ${inp.value.trim()}`); inp.value='' }
                      }
                    }} />
                    <button onClick={()=>{
                      const inp=document.getElementById(`note-${s.id}`) as HTMLInputElement
                      if(inp?.value.trim()){ useStore.getState().appendSessionNote(s.id, `[${new Date().toLocaleTimeString()}] ${inp.value.trim()}`); inp.value='' }
                    }} className="px-3 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs">Log</button>
                  </div>
                )}
                {s.notes && <div className="mt-3 text-xs bg-zinc-50 dark:bg-zinc-800 border rounded-xl p-3 whitespace-pre-wrap">{s.notes}</div>}
                {s.summary && (
                  <div className="mt-3 text-sm bg-zinc-50 dark:bg-zinc-800 border rounded-xl p-3">
                    <div>{s.summary}</div>
                    <div className="mt-2"><AgentSendButtons session={s} tasks={projTasks} /></div>
                  </div>
                )}
                {s.tasks_completed.length>0 && <div className="mt-2 flex flex-wrap gap-1.5">{s.tasks_completed.map(id=>{
                  const t=projTasks.find(x=> x.id===id)
                  return t? <span key={id} className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border">✓ #{String(t.number).padStart(3,'0')} {t.title}</span> : <span key={id} className="text-xs px-2 py-1 rounded-full bg-zinc-50 border">{id.slice(-4)}</span>
                })}</div>}
              </div>
            )
          })}
        </div>
      )}

      {activeTab==='activity' && (
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
          <h3 className="font-semibold">Activity</h3>
          <div className="mt-4 space-y-0 relative">
            <div className="absolute left-2 top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-700" />
            {projActivities.length===0? <div className="text-sm text-zinc-500">No activity</div> : projActivities.map(a=>{
              const d=new Date(a.created_at)
              return (
                <div key={a.id} className="relative pl-8 py-2">
                  <span className="absolute left-0 top-3 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 border-2 border-violet-600 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-violet-600"/></span>
                  <div className="text-xs text-zinc-500">{d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                  <div className="text-sm">{a.description}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showTaskModal && <TaskModal projectId={project.id} onClose={()=>setShowTaskModal(false)} />}
    </div>
  )
}

function TasksTab({tasks, onAdd, projectId, highlightId}:{projectId:string, tasks: import('../lib/types').Task[], onAdd:()=>void, highlightId?:string}){
  const [view, setView] = useState<'board'|'list'>(()=> highlightId ? 'board' : (localStorage.getItem('vb-project-tasks-view') as any) || 'board')
  const updateTask = useStore(s=>s.updateTask)
  const deleteTask = useStore(s=>s.deleteTask)
  const t = useT()
  const [filter, setFilter]=useState<TaskStatus|'ALL'>('ALL')
  const filtered = filter==='ALL'? tasks : tasks.filter(tt=> (tt.status as string)===filter)
  const setViewPersist = (v:'board'|'list')=>{ localStorage.setItem('vb-project-tasks-view', v); setView(v)}
  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{t('project.tasks')} — {tasks.length}</h3>
          <div className="flex rounded-xl border overflow-hidden bg-zinc-50 dark:bg-zinc-800 p-1 ml-2">
            <button onClick={()=> setViewPersist('board')} className={`px-3 py-1 rounded-lg text-xs font-medium ${view==='board'?'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900':'text-zinc-600'}`}>{t('tasks.board')}</button>
            <button onClick={()=> setViewPersist('list')} className={`px-3 py-1 rounded-lg text-xs font-medium ${view==='list'?'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900':'text-zinc-600'}`}>{t('tasks.list')}</button>
          </div>
        </div>
        <div className="flex gap-2">
          {view==='list' && (
            <select value={filter} onChange={e=>setFilter(e.target.value as any)} className="px-3 py-1.5 rounded-full border text-xs bg-zinc-50 dark:bg-zinc-800">
              <option value="ALL">{t('projects.filterAll')}</option><option value="TODO">{t('taskStatus.TODO')}</option><option value="IN_PROGRESS">{t('taskStatus.IN_PROGRESS')}</option><option value="REVIEW">{t('taskStatus.REVIEW')}</option><option value="DONE">{t('taskStatus.DONE')}</option><option value="BLOCKED">{t('taskStatus.BLOCKED')}</option>
            </select>
          )}
          <button onClick={onAdd} className="px-3 py-1.5 rounded-full bg-violet-600 text-white text-xs">+ {t('tasks.addTask')}</button>
        </div>
      </div>
      {view==='board' ? (
        <TaskBoard tasks={tasks} projectId={projectId} highlightId={highlightId} onAdd={()=> onAdd()} />
      ) : (
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden divide-y">
          {filtered.length===0? <div className="p-6 text-center text-sm text-zinc-500">{t('tasks.noTasks')}</div> : filtered.map((tt)=>(
            <div key={tt.id} id={`focus-${tt.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 scroll-mt-24 ${highlightId===tt.id?'ring-2 ring-inset ring-violet-500 bg-violet-50/50 dark:bg-violet-950/20':''}`}>
              <span className="font-mono text-xs text-zinc-500">#{String(tt.number).padStart(3,'0')}</span>
              <span className="flex-1 text-sm font-medium truncate">{tt.title}</span>
              <span className={`text-xs px-2 py-1 rounded-full border ${useStore.getState().tasks ? '' : ''}`}>{t(`priority.${tt.priority}`)}</span>
              <select value={tt.status} onChange={e=> updateTask(tt.id,{status:e.target.value as TaskStatus})} className="text-xs px-2 py-1 rounded-full border bg-white dark:bg-zinc-900">
                <option value="TODO">○ {t('taskStatus.TODO')}</option><option value="IN_PROGRESS">◐ {t('taskStatus.IN_PROGRESS')}</option><option value="REVIEW">◑ {t('taskStatus.REVIEW')}</option><option value="DONE">✓ {t('taskStatus.DONE')}</option><option value="BLOCKED">✕ {t('taskStatus.BLOCKED')}</option><option value="CANCELLED">— {t('taskStatus.CANCELLED')}</option>
              </select>
              <button onClick={()=> deleteTask(tt.id)} className="text-zinc-400 hover:text-red-500">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function IdeasTab({projectId, ideas, highlightId}:{projectId:string, ideas: import('../lib/types').Idea[], highlightId?:string}){
  const [view, setView] = useState<'board'|'list'>(()=> highlightId ? 'board' : (localStorage.getItem('vb-project-ideas-view') as any) || 'board')
  const updateIdea = useStore(s=>s.updateIdea)
  const convertIdeaToTask = useStore(s=>s.convertIdeaToTask)
  const deleteIdea = useStore(s=>s.deleteIdea)
  const t = useT()
  const [filter, setFilter]=useState<import('../lib/types').IdeaStatus|'ALL'>('ALL')
  const [showCreate, setShowCreate]=useState(false)
  const [createStatus, setCreateStatus]=useState<import('../lib/types').IdeaStatus>('INBOX')
  const filtered = filter==='ALL'? ideas : ideas.filter(i=> (i.status ?? 'INBOX')===filter)
  const setViewPersist = (v:'board'|'list')=>{ localStorage.setItem('vb-project-ideas-view', v); setView(v)}
  return (
    <div className="space-y-3">
      <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{t('ideas.boardTitle')} — {ideas.length}</h3>
          <div className="flex rounded-xl border overflow-hidden bg-zinc-50 dark:bg-zinc-800 p-1 ml-2">
            <button onClick={()=> setViewPersist('board')} className={`px-3 py-1 rounded-lg text-xs font-medium ${view==='board'?'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900':'text-zinc-600'}`}>{t('tasks.board')}</button>
            <button onClick={()=> setViewPersist('list')} className={`px-3 py-1 rounded-lg text-xs font-medium ${view==='list'?'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900':'text-zinc-600'}`}>{t('tasks.list')}</button>
          </div>
        </div>
        <div className="flex gap-2">
          {view==='list' && (
            <select value={filter} onChange={e=>setFilter(e.target.value as any)} className="px-3 py-1.5 rounded-full border text-xs bg-zinc-50 dark:bg-zinc-800">
              <option value="ALL">{t('projects.filterAll')}</option><option value="INBOX">📥 Inbox</option><option value="CONSIDERED">👀 Considered</option><option value="PLANNED">📌 Planned</option><option value="DROPPED">🗑️ Dropped</option>
            </select>
          )}
          <button onClick={()=>{ setCreateStatus('INBOX'); setShowCreate(true) }} className="px-3 py-1.5 rounded-full bg-violet-600 text-white text-xs">+ {t('ideas.new')}</button>
        </div>
      </div>
      {showCreate && <IdeaModal projectId={projectId} initialStatus={createStatus} onClose={()=>setShowCreate(false)} />}
      {view==='board' ? (
        <IdeaBoard ideas={ideas} highlightId={highlightId} onAdd={(status)=>{ setCreateStatus(status); setShowCreate(true) }} />
      ) : (
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden divide-y">
          {filtered.length===0? <div className="p-6 text-center text-sm text-zinc-500">{t('ideas.noIdeasShort')}</div> : filtered.map((i)=>(
            <div key={i.id} id={`focus-${i.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 scroll-mt-24 ${highlightId===i.id?'ring-2 ring-inset ring-violet-500 bg-violet-50/50 dark:bg-violet-950/20':''}`}>
              <span className="text-sm">💡</span>
              <span className="flex-1 text-sm font-medium truncate">{i.title}</span>
              {i.effort && <span className="hidden sm:inline text-xs px-2 py-1 rounded-full border bg-zinc-50 dark:bg-zinc-800">{i.effort}</span>}
              <select value={i.status ?? 'INBOX'} onChange={e=> updateIdea(i.id,{status:e.target.value as import('../lib/types').IdeaStatus})} className="text-xs px-2 py-1 rounded-full border bg-white dark:bg-zinc-900">
                <option value="INBOX">📥 Inbox</option><option value="CONSIDERED">👀 Considered</option><option value="PLANNED">📌 Planned</option><option value="DROPPED">🗑️ Dropped</option>
              </select>
              {!i.converted_to_task && <button onClick={()=> convertIdeaToTask(i.id)} className="text-xs px-2 py-1 rounded-full bg-violet-600 text-white">→ Task</button>}
              <button onClick={()=> deleteIdea(i.id)} className="text-zinc-400 hover:text-red-500">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TaskModal({projectId, onClose}:{projectId:string,onClose:()=>void}){
  const addTask = useStore(s=>s.addTask)
  const t = useT()
  const [title,setTitle]=useState('')
  const [status,setStatus]=useState<TaskStatus>('TODO')
  const [priority,setPriority]=useState<TaskPriority>('MEDIUM')
  const [desc,setDesc]=useState('')
  const [error,setError]=useState<string|null>(null)
  const submit=()=>{
    if(!title.trim()){ setError(t('tasks.create.titleRequired')); return}
    addTask({project_id:projectId, title:title.trim(), description:desc, status, priority})
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 border shadow-xl">
        <h3 className="font-semibold">{t('tasks.create.title')}</h3>
        <div className="mt-4 space-y-3">
          <label className="block"><span className="text-xs font-medium">{t('tasks.create.titleLabel')}</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder={t('tasks.create.placeholder')} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-medium">{t('tasks.create.status')}</span>
              <select value={status} onChange={e=>setStatus(e.target.value as TaskStatus)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm">
                <option value="TODO">{t('taskStatus.TODO')}</option><option value="IN_PROGRESS">{t('taskStatus.IN_PROGRESS')}</option><option value="REVIEW">{t('taskStatus.REVIEW')}</option><option value="DONE">{t('taskStatus.DONE')}</option><option value="BLOCKED">{t('taskStatus.BLOCKED')}</option>
              </select>
            </label>
            <label className="block"><span className="text-xs font-medium">{t('tasks.create.priority')}</span>
              <select value={priority} onChange={e=>setPriority(e.target.value as TaskPriority)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm">
                <option value="LOW">{t('priority.LOW')}</option><option value="MEDIUM">{t('priority.MEDIUM')}</option><option value="HIGH">{t('priority.HIGH')}</option><option value="URGENT">{t('priority.URGENT')}</option>
              </select>
            </label>
          </div>
          <label className="block"><span className="text-xs font-medium">{t('tasks.create.description')}</span><textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm" /></label>
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm">{t('common.cancel')}</button>
          <button onClick={submit} className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium">{t('tasks.create.submit')}</button>
        </div>
      </div>
    </div>
  )
}
