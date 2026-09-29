import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { hybridStorage } from '../lib/sqliteStore'
import type { Project, Task, Idea, Note, Session, Activity, ProjectType, ProjectStatus, TaskStatus, TaskPriority } from '../lib/types'
import { generateProjectCode, calcProgress, uid, nowIso, analyzeLanguages, detectTechStack, analyzeLanguagesFromHandle, newestCommitIso, type ScannedProject } from '../lib/utils'
import { readGitHistory } from '../lib/git'
import { registerHandle, registerNativeRoot } from '../lib/watch'
import { safeGet, safeSet } from '../lib/storage'
import { createSeedData } from '../lib/seed'

function initialLocale(): Locale {
  const s = safeGet('vibeboard-locale')
  if (s && /^[a-z-]{2,12}$/i.test(s)) return s.toLowerCase()
  try {
    const nav = typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() ?? '' : ''
    for(const code of ['ru','de','fr','es','zh'] as const){
      if(nav.startsWith(code)) return code
    }
  } catch { /* ignore */ }
  return 'en'
}
function maxNum(nums: number[]): number {
  let m = 0
  for (const n of nums) if (Number.isFinite(n) && n > m) m = n
  return m
}

interface SearchResult { type:'project'|'task'|'idea'|'note', id:string, projectId?:string, title:string, subtitle:string, match?:string }

import type { Locale } from '../lib/i18n'
import { localeTemplate, parseLocaleFile, setCustomLocales, type CustomLocaleInfo } from '../lib/i18n'

interface AppState {
  folder: string | null
  hasOnboarded: boolean
  projects: Project[]
  tasks: Task[]
  ideas: Idea[]
  notes: Note[]
  sessions: Session[]
  activities: Activity[]
  // ui
  locale: Locale
  projectFilter: ProjectStatus | 'ALL'
  taskFilter: TaskStatus | 'ALL'
  searchQuery: string
  customLocales: CustomLocaleInfo[]
  // actions
  setFolder: (path:string)=>void
  scanProjects: (found:{name:string, files:string[], packageJson?:any, hasGit:boolean, vfiles?:ScannedProject['vfiles'], gitHistory?:ScannedProject['gitHistory']}[], opts?:{rootPath?:string})=>void
  addProject: (data:{name:string,type:ProjectType,description:string,status:ProjectStatus, local_path?:string})=>Project
  addProjectFromFolder: (info:{name:string, files:string[], packageJson?:any, hasGit:boolean, customPath?:string, vibeConfig?:any, languages?:any[], vfiles?:ScannedProject['vfiles'], gitHistory?:ScannedProject['gitHistory']})=>Project
  addProjectFromHandle: (handle:any, customPath?:string)=>Promise<Project>
  updateProject: (id:string, patch:Partial<Project>)=>void
  deleteProject: (id:string)=>void
  addTask: (data:{project_id:string,title:string,description?:string,status:TaskStatus,priority:TaskPriority})=>Task
  updateTask: (id:string, patch:Partial<Task>)=>void
  deleteTask: (id:string)=>void
  addIdea: (project_id:string,title:string, description?:string, extra?:Partial<Idea>)=>Idea
  updateIdea: (id:string, patch:Partial<Idea>)=>void
  voteIdea: (id:string, delta:number)=>void
  convertIdeaToTask: (ideaId:string)=>void
  deleteIdea: (id:string)=>void
  bulkConvertIdeas: (ids:string[])=>void
  addNote: (project_id:string, content:string)=>Note
  updateNote: (id:string, content:string)=>void
  deleteNote: (id:string)=>void
  addSession: (project_id:string, goal:string)=>Session
  updateSession: (id:string, patch:Partial<Session>)=>void
  endSession: (id:string, summary:string)=>void
  appendSessionNote: (id:string, note:string)=>void
  togglePauseSession: (id:string)=>void
  addActivity: (a:Omit<Activity,'id'|'created_at'>)=>void
  setLocale:(l:Locale)=>void
  setProjectFilter:(f:ProjectStatus|'ALL')=>void
  setTaskFilter:(f:TaskStatus|'ALL')=>void
  setSearchQuery:(q:string)=>void
  resetToSeed:()=>void
  initializeIfEmpty:()=>void
  clearAll:()=>void
  globalSearch:(q:string)=>SearchResult[]
  exportProject:(id:string)=>string|null
  importProject:(json:string)=>{ok:boolean, error?:string, code?:string}
  importCustomLocale:(json:string)=>{ok:true, code:string, updated:boolean, count:number}|{ok:false, error:string}
  removeCustomLocale:(code:string)=>void
  exportLocaleTemplate:()=>string
}

export const useStore = create<AppState>()(persist((set,get)=>({
  folder: null,
  hasOnboarded: false,
  projects: [],
  tasks: [],
  ideas: [],
  notes: [],
  sessions: [],
  activities: [],
  locale: initialLocale(),
  projectFilter: 'ALL',
  taskFilter: 'ALL',
  searchQuery: '',
  customLocales: [],

  setFolder: (path)=> set({ folder:path, hasOnboarded:true }),
  scanProjects: (found, opts)=>{
    const { projects } = get()
    const newProjects: Project[] = []
    const nowAdd: Activity[] = []
    // Нативный корень Tauri: реальные пути для local_path + регистрация watch-корней
    const rootPath = opts?.rootPath?.replace(/[\\/]+$/, '') || null
    for(const f of found){
      if(projects.some(p=> p.name.toLowerCase()===f.name.toLowerCase()) || newProjects.some(p=> p.name.toLowerCase()===f.name.toLowerCase())) continue
      // infer type from name/tech
      let type: ProjectType = 'OTHER'
      const low = f.name.toLowerCase()
      if(low.includes('bot')) type='BOT'
      else if(low.includes('ai')) type='AI'
      else if(low.includes('game')|| low.includes('velmara')) type='GAME'
      else if(f.files.includes('pubspec.yaml')) type='APP'
      else if(f.files.includes('package.json')) type='WEB'
      else if(f.files.includes('Cargo.toml')) type='TOOL'
      // code
      const code = generateProjectCode(type, [...projects, ...newProjects] as Project[])
      // Честный анализ: реальные файлы из скана; если их нет — пусто, без выдумок
      const scanned = f as ScannedProject
      const realFiles = Array.isArray(scanned.vfiles) ? scanned.vfiles : []
      const langs = realFiles.length ? analyzeLanguages(realFiles) : []
      const techs = detectTechStack(f.files, f.packageJson)
      const p: Project = {
        id: uid(),
        code,
        name: f.name,
        description: f.packageJson?.description ?? '',
        type,
        status: 'PLANNING',
        local_path: rootPath ? `${rootPath}/${f.name}` : `${get().folder ?? '~/Projects'}/${f.name}`,
        progress: 0,
        created_at: nowIso(),
        updated_at: nowIso(),
        git_repository: f.hasGit ? `github.com/you/${f.name}`: undefined,
        default_branch: f.hasGit? 'main': undefined,
        branch: f.hasGit? 'main': undefined,
        last_commit: newestCommitIso(Array.isArray(scanned.gitHistory) ? scanned.gitHistory : []),
        commits_this_week: 0,
        changes_modified: 0,
        changes_untracked: 0,
        languages: langs.map(l=>({ ...l, project_id:'' })),
        technologies: techs,
      }
      langs.forEach(l=> l.project_id = p.id)
      if (rootPath) { try{ registerNativeRoot(p.id, `${rootPath}/${f.name}`) }catch{} }
      newProjects.push(p)
      nowAdd.push({ id:uid(), project_id:p.id, type:'project_scanned', description:`Discovered project ${p.code} ${p.name}`, created_at: nowIso() })
    }
    if(newProjects.length){
      set({ projects:[...projects, ...newProjects], activities:[...nowAdd, ...get().activities] })
    }
  },

  addProject: (data)=>{
    const st=get()
    const code = generateProjectCode(data.type, st.projects as Project[])
    // Ручное создание без папки: языков нет — показываем пусто, а не выдумываем
    const langs: ReturnType<typeof analyzeLanguages> = []
    const p: Project = {
      id: uid(),
      code, name:data.name, description:data.description, type:data.type, status:data.status,
      local_path: data.local_path ?? `${st.folder ?? '~/Projects'}/${data.name}`,
      progress:0,
      created_at: nowIso(), updated_at: nowIso(),
      languages: langs.map(l=> ({...l, project_id:''})),
      technologies: detectTechStack([], undefined),
    }
    langs.forEach(l=> l.project_id = p.id)
    // Без папки стек неизвестен — пусто вместо выдуманного по типу
    set({ projects:[...st.projects,p], activities:[{id:uid(), project_id:p.id, type:'project_created', description:`Created project ${p.code}`, created_at: nowIso()}, ...st.activities] })
    return p
  },
  addProjectFromFolder: (info)=>{
    const st=get()
    let type: ProjectType = 'OTHER'
    const low = info.name.toLowerCase()
    if(info.vibeConfig?.type) type = info.vibeConfig.type as ProjectType
    else if(low.includes('bot')) type='BOT'
    else if(low.includes('ai')) type='AI'
    else if(low.includes('game')|| low.includes('velmara')) type='GAME'
    else if(info.files.includes('pubspec.yaml')) type='APP'
    else if(info.files.includes('package.json')) type='WEB'
    else if(info.files.includes('Cargo.toml')) type='TOOL'
    if(st.projects.some(p=> p.name.toLowerCase()===info.name.toLowerCase())) throw new Error('Project already exists')
    const code = info.vibeConfig?.code ?? generateProjectCode(type, st.projects as Project[])
    let langs = info.languages as any
    if(!langs){
      // Папка без доступа к содержимому — честно пусто, без синтетики
      const vfiles = Array.isArray(info.vfiles) ? info.vfiles : []
      langs = vfiles.length ? analyzeLanguages(vfiles) : []
    }
    const techs = detectTechStack(info.files, info.packageJson)
    const local_path = info.customPath ?? info.vibeConfig?.local_path ?? `${st.folder ?? '~/Projects'}/${info.name}`
    const p: Project = {
      id: uid(),
      code,
      name: info.vibeConfig?.name ?? info.name,
      description: info.vibeConfig?.description ?? info.packageJson?.description ?? '',
      type,
      status: info.vibeConfig?.status ?? 'PLANNING',
      local_path,
      progress:0,
      created_at: nowIso(), updated_at: nowIso(),
      git_repository: info.hasGit ? `github.com/you/${info.name}`: undefined,
      default_branch: info.hasGit? 'main': undefined,
      branch: info.hasGit? 'main': undefined,
      last_commit: newestCommitIso(Array.isArray(info.gitHistory) ? info.gitHistory : []),
      commits_this_week: 0,
      changes_modified: 0,
      changes_untracked: 0,
      languages: (langs as any[]).map((l:any)=> ({...l, project_id:''})),
      technologies: techs,
    }
    ;(langs as any[]).forEach((l:any)=> l.project_id = p.id)
    set({ projects:[...st.projects,p], activities:[{id:uid(), project_id:p.id, type:'project_scanned', description:`Added project ${p.code} from folder ${info.name}`, created_at: nowIso()}, ...st.activities] })
    return p
  },
  addProjectFromHandle: async (handle:any, customPath?:string)=>{
    const name = handle.name
    const files:string[] = []
    let hasGit=false
    let pkg:any=undefined
    let vibe:any=null
    try{
      for await (const e of handle.values()){
        files.push(e.name)
        if(e.name==='.git') hasGit=true
        if(e.name==='package.json' && e.kind==='file'){
          try{ const f=await e.getFile(); const txt=await f.text(); pkg=JSON.parse(txt)}catch{}
        }
        if(e.name==='.vibeboard.json' && e.kind==='file'){
          try{ const f=await e.getFile(); const txt=await f.text(); vibe=JSON.parse(txt)}catch{}
        }
      }
    }catch{}
    let langs:any[]|undefined
    try{
      const vfiles = await analyzeLanguagesFromHandle(handle)
      if(vfiles.length) langs = analyzeLanguages(vfiles)
      else langs = []
    }catch{ langs = [] }
    const st=get()
    if(st.projects.some(p=> p.name.toLowerCase()===name.toLowerCase())) throw new Error('Project already exists')
    let type: ProjectType = vibe?.type ?? 'OTHER'
    if(!vibe?.type){
      const low=name.toLowerCase()
      if(low.includes('bot')) type='BOT'
      else if(low.includes('ai')) type='AI'
      else if(low.includes('game')|| low.includes('velmara')) type='GAME'
      else if(files.includes('pubspec.yaml')) type='APP'
      else if(files.includes('package.json')) type='WEB'
      else if(files.includes('Cargo.toml')) type='TOOL'
    }
    const code = vibe?.code ?? generateProjectCode(type, st.projects as Project[])
    if(!langs) langs = []
    const techs = detectTechStack(files, pkg)
    const local_path = customPath ?? vibe?.local_path ?? `${st.folder ?? '~/Projects'}/${name}`
    const p: Project = {
      id: uid(),
      code,
      name: vibe?.name ?? name,
      description: vibe?.description ?? pkg?.description ?? '',
      type,
      status: vibe?.status ?? 'PLANNING',
      local_path,
      progress:0,
      created_at: nowIso(), updated_at: nowIso(),
      git_repository: hasGit ? `github.com/you/${name}`: undefined,
      default_branch: hasGit? 'main': undefined,
      branch: hasGit? 'main': undefined,
      last_commit: newestCommitIso(await readGitHistory(handle).catch(()=>[])),
      commits_this_week: 0,
      changes_modified: 0,
      changes_untracked: 0,
      languages: (langs as any[]).map((l:any)=> ({...l, project_id:''})),
      technologies: techs,
    }
    ;(langs as any[]).forEach((l:any)=> l.project_id = p.id)
    set({ projects:[...st.projects,p], activities:[{id:uid(), project_id:p.id, type:'project_scanned', description:`Added project ${p.code} from folder ${name} (real scan)`, created_at: nowIso()}, ...st.activities] })
    // register for watch
    try{ registerHandle(p.id, handle) }catch{}
    return p
  },
  updateProject: (id,patch)=> set(s=>({ projects: s.projects.map(p=> p.id===id? {...p, ...patch, updated_at: nowIso()}:p)})),
  deleteProject: (id)=> set(s=>({ projects: s.projects.filter(p=>p.id!==id), tasks: s.tasks.filter(t=>t.project_id!==id), ideas:s.ideas.filter(i=>i.project_id!==id), notes:s.notes.filter(n=>n.project_id!==id), sessions:s.sessions.filter(ss=>ss.project_id!==id), activities:s.activities.filter(a=>a.project_id!==id) })),

  addTask: (data)=>{
    const st=get()
    const nums = st.tasks.filter(t=>t.project_id===data.project_id).map(t=>t.number)
    const nextNum = maxNum(nums)+1
    const t: Task = { id:uid(), project_id:data.project_id, number:nextNum, title:data.title, description:data.description, status:data.status, priority:data.priority, created_at:nowIso(), updated_at:nowIso(), completed_at: data.status==='DONE'? nowIso():undefined }
    const newTasks=[...st.tasks,t]
    const prog = calcProgress(newTasks.filter(x=>x.project_id===data.project_id))
    set({
      tasks:newTasks,
      projects: st.projects.map(p=> p.id===data.project_id? {...p, progress:prog, updated_at:nowIso()}:p),
      activities:[{id:uid(), project_id:data.project_id, type:'created_task', description:`Created task #${String(nextNum).padStart(3,'0')} ${data.title}`, created_at:nowIso()}, ...st.activities]
    })
    if(data.status==='DONE'){
      set(s=>({ activities:[{id:uid(), project_id:data.project_id, type:'completed_task', description:`Completed task #${String(nextNum).padStart(3,'0')}`, created_at:nowIso()}, ...s.activities]}))
    }
    return t
  },
  updateTask: (id,patch)=>{
    const st=get()
    const task = st.tasks.find(t=>t.id===id)
    if(!task) return
    const prevStatus = task.status
    const updated: Task = { ...task, ...patch, updated_at:nowIso(), completed_at: (patch.status==='DONE'? nowIso(): patch.status? undefined : task.completed_at) }
    const newTasks = st.tasks.map(t=> t.id===id? updated: t)
    const prog = calcProgress(newTasks.filter(x=>x.project_id===task.project_id))
    const activities = [...st.activities]
    if(patch.status && patch.status!==prevStatus){
      if(patch.status==='DONE') activities.unshift({id:uid(), project_id:task.project_id, type:'completed_task', description:`Completed task #${String(task.number).padStart(3,'0')} ${task.title}`, created_at:nowIso()})
      else activities.unshift({id:uid(), project_id:task.project_id, type:'status_change', description:`Moved #${String(task.number).padStart(3,'0')} to ${patch.status}`, created_at:nowIso()})
    }
    // auto-link to active session
    let newSessions = st.sessions as Session[]
    if(patch.status==='DONE'){
      const active = st.sessions.find(s=> s.project_id===task.project_id && !s.ended_at)
      if(active && !active.tasks_completed.includes(id)){
        newSessions = st.sessions.map(s=> s.id===active.id? {...s, tasks_completed: [...s.tasks_completed, id]}:s)
      }
    }
    set({ tasks:newTasks, projects: st.projects.map(p=> p.id===task.project_id? {...p, progress:prog, updated_at:nowIso()}:p), activities, sessions: newSessions })
  },
  deleteTask: (id)=>{
    const st=get()
    const t = st.tasks.find(x=>x.id===id)
    if(!t) return
    const newTasks = st.tasks.filter(x=>x.id!==id)
    const prog = calcProgress(newTasks.filter(x=>x.project_id===t.project_id))
    set({ tasks:newTasks, projects: st.projects.map(p=> p.id===t.project_id? {...p, progress:prog}:p)})
  },
  addIdea: (project_id,title,description, extra)=>{
    const idea:Idea={
      id:uid(), project_id, title, description, created_at:nowIso(),
      status: extra?.status ?? 'INBOX',
      votes: extra?.votes ?? 0,
      tags: extra?.tags ?? [],
      effort: extra?.effort,
      priority: extra?.priority,
    }
    set(s=>({ ideas:[idea, ...s.ideas], activities:[{id:uid(), project_id, type:'added_idea', description:`Added idea "${title}"`, created_at:nowIso()}, ...s.activities]}))
    return idea
  },
  updateIdea: (id,patch)=> set(s=>({ ideas: s.ideas.map(i=> i.id===id? {...i, ...patch}:i)})),
  voteIdea: (id,delta)=> set(s=>({ ideas: s.ideas.map(i=> i.id===id? {...i, votes: Math.max(0, (i.votes??0)+delta)}:i)})),
  bulkConvertIdeas: (ids)=>{
    const st=get()
    const toConvert = st.ideas.filter(i=> ids.includes(i.id) && !i.converted_to_task)
    let newTasks=[...st.tasks]
    const updatedIdeas=[...st.ideas]
    const acts: Activity[]=[]
    for(const idea of toConvert){
      const nums = newTasks.filter(t=>t.project_id===idea.project_id).map(t=>t.number)
      const nextNum = maxNum(nums)+1
      const t: Task = { id:uid(), project_id:idea.project_id, number:nextNum, title:idea.title, description:idea.description, status:'TODO', priority: idea.priority ?? 'MEDIUM', created_at:nowIso(), updated_at:nowIso()}
      newTasks.push(t)
      const idx = updatedIdeas.findIndex(x=>x.id===idea.id)
      updatedIdeas[idx]={...updatedIdeas[idx], converted_to_task:t.id, status:'PLANNED' as any}
      acts.push({id:uid(), project_id:idea.project_id, type:'created_task', description:`Converted idea "${idea.title}" to #${String(nextNum).padStart(3,'0')}`, created_at:nowIso()})
    }
    const progMap = new Map<string,number>()
    for(const p of st.projects) progMap.set(p.id, calcProgress(newTasks.filter(x=>x.project_id===p.id)))
    set({ tasks:newTasks, ideas: updatedIdeas, projects: st.projects.map(p=> progMap.has(p.id)? {...p, progress: progMap.get(p.id)!, updated_at: nowIso()}:p), activities:[...acts, ...st.activities] })
  },
  convertIdeaToTask: (ideaId)=>{
    const st=get()
    const idea = st.ideas.find(i=>i.id===ideaId)
    if(!idea) return
    // create task
    const nums = st.tasks.filter(t=>t.project_id===idea.project_id).map(t=>t.number)
    const nextNum = maxNum(nums)+1
    const t: Task = { id:uid(), project_id:idea.project_id, number:nextNum, title:idea.title, description:idea.description, status:'TODO', priority:'MEDIUM', created_at:nowIso(), updated_at:nowIso()}
    const newTasks=[...st.tasks,t]
    const prog = calcProgress(newTasks.filter(x=>x.project_id===idea.project_id))
    set({
      tasks:newTasks,
      projects: st.projects.map(p=> p.id===idea.project_id? {...p, progress:prog}:p),
      ideas: st.ideas.map(i=> i.id===ideaId? {...i, converted_to_task:t.id}:i),
      activities:[{id:uid(), project_id:idea.project_id, type:'created_task', description:`Converted idea "${idea.title}" to #${String(nextNum).padStart(3,'0')}`, created_at:nowIso()}, ...st.activities]
    })
  },
  deleteIdea: (id)=> set(s=>({ ideas:s.ideas.filter(i=>i.id!==id)})),
  addNote: (project_id,content)=>{
    const n:Note={ id:uid(), project_id, content, created_at:nowIso(), updated_at:nowIso()}
    set(s=>({ notes:[n, ...s.notes], activities:[{id:uid(), project_id, type:'added_note', description:`Added note`, created_at:nowIso()}, ...s.activities]}))
    return n
  },
  updateNote:(id,content)=> set(s=>({ notes: s.notes.map(n=> n.id===id? {...n, content, updated_at:nowIso()}:n)})),
  deleteNote:(id)=> set(s=>({ notes: s.notes.filter(n=>n.id!==id)})),
  addSession:(project_id,goal)=>{
    const sess:Session={ id:uid(), project_id, goal, started_at:nowIso(), tasks_completed:[], notes:'', is_paused:false, paused_ms:0 }
    set(s=>({ sessions:[sess, ...s.sessions], activities:[{id:uid(), project_id, type:'session', description:`Started session: ${goal}`, created_at:nowIso()}, ...s.activities]}))
    return sess
  },
  updateSession:(id,patch)=> set(s=>({ sessions: s.sessions.map(ss=> ss.id===id? {...ss, ...patch}:ss)})),
  endSession:(id,summary)=> set(s=>({ sessions: s.sessions.map(ss=> ss.id===id? {...ss, ended_at:nowIso(), summary, is_paused:false, paused_at:undefined}:ss)})),
  appendSessionNote:(id,note)=> set(s=>({ sessions: s.sessions.map(ss=> ss.id===id? {...ss, notes: (ss.notes? ss.notes+'\n':'')+note}:ss)})),
  togglePauseSession:(id)=> set(s=>{
    const sess=s.sessions.find(x=>x.id===id)
    if(!sess) return s
    if(sess.is_paused){
      const pausedFor = sess.paused_at ? Date.now()- new Date(sess.paused_at).getTime() : 0
      return { sessions: s.sessions.map(x=> x.id===id? {...x, is_paused:false, paused_at:undefined, paused_ms: (x.paused_ms??0)+pausedFor }:x)}
    } else {
      return { sessions: s.sessions.map(x=> x.id===id? {...x, is_paused:true, paused_at: nowIso() }:x)}
    }
  }),
  addActivity:(a)=> set(s=>({ activities:[{id:uid(), ...a, created_at:nowIso()}, ...s.activities]})),
  setLocale:(l)=> { safeSet('vibeboard-locale', l); set({locale:l}) },
  setProjectFilter:(f)=> set({projectFilter:f}),
  setTaskFilter:(f)=> set({taskFilter:f}),
  setSearchQuery:(q)=> set({searchQuery:q}),
  importCustomLocale:(json)=>{
    let data: unknown
    try{ data = JSON.parse(json) }catch{ return { ok:false as const, error:'bad-file' } }
    const parsed = parseLocaleFile(data)
    if(!parsed.ok) return { ok:false as const, error: parsed.error }
    const list = [...get().customLocales]
    const idx = list.findIndex(l=> l.code === parsed.value.code)
    const updated = idx >= 0
    if(updated) list[idx] = parsed.value
    else list.push(parsed.value)
    set({ customLocales: list })
    setCustomLocales(list)
    return { ok:true as const, code: parsed.value.code, updated, count: Object.keys(parsed.value.dict).length }
  },
  removeCustomLocale:(code)=>{
    const next = get().customLocales.filter(l=> l.code !== code)
    set({ customLocales: next })
    setCustomLocales(next)
    if(get().locale === code) get().setLocale('en')
  },
  exportLocaleTemplate:()=> localeTemplate(),
  resetToSeed:()=>{
    const seed = createSeedData()
    set({ projects: seed.projects, tasks: seed.tasks, ideas: seed.ideas, notes: seed.notes, sessions: seed.sessions, activities: seed.activities, folder: seed.folder, hasOnboarded:true })
  },
  initializeIfEmpty:()=>{
    // no auto-seed — clean start. Demo data only via explicit Reset to demo in Settings.
    const s=get()
    if(s.hasOnboarded && s.folder) return
    // stay empty, onboarding will handle
  },
  clearAll: ()=> set({ projects:[], tasks:[], ideas:[], notes:[], sessions:[], activities:[], folder:null, hasOnboarded:false, projectFilter:'ALL', taskFilter:'ALL', searchQuery:'' } as any),
  exportProject:(id)=>{
    const s=get()
    const project = s.projects.find(p=>p.id===id)
    if(!project) return null
    return JSON.stringify({
      app:'vibeboard', version:1, exportedAt: nowIso(),
      project,
      tasks: s.tasks.filter(x=>x.project_id===id),
      ideas: s.ideas.filter(x=>x.project_id===id),
      notes: s.notes.filter(x=>x.project_id===id),
      sessions: s.sessions.filter(x=>x.project_id===id),
      activities: s.activities.filter(x=>x.project_id===id),
    }, null, 2)
  },
  importProject:(json)=>{
    let data:any
    try{ data = JSON.parse(json) }catch{ return {ok:false, error:'parse'} }
    const src = data?.project
    if(!src || typeof src.name!=='string' || !src.name.trim()) return {ok:false, error:'shape'}
    const st=get()
    const TYPES: ProjectType[] = ['WEB','APP','GAME','BOT','AI','TOOL','OTHER']
    const STATUSES: ProjectStatus[] = ['PLANNING','ACTIVE','PAUSED','BLOCKED','TESTING','COMPLETED','ARCHIVED']
    const type: ProjectType = TYPES.includes(src.type) ? src.type : 'OTHER'
    const status: ProjectStatus = STATUSES.includes(src.status) ? src.status : 'PLANNING'
    const codeTaken = st.projects.some(p=>p.code===src.code)
    const code = (typeof src.code==='string' && src.code && !codeTaken) ? src.code : generateProjectCode(type, st.projects)
    const newPid = uid()
    const taskMap = new Map<string,string>()
    const ideaMap = new Map<string,string>()
    const arr = (v:unknown)=> Array.isArray(v) ? v : []
    const tasks: Task[] = arr(data.tasks).filter((x:any)=>x && typeof x.title==='string').map((x:any)=>{
      const nid = uid(); if(typeof x.id==='string') taskMap.set(x.id, nid)
      return { id:nid, project_id:newPid, number:0, title:String(x.title).slice(0,200), description: typeof x.description==='string'? x.description.slice(0,2000):undefined, status:['TODO','IN_PROGRESS','REVIEW','DONE','BLOCKED','CANCELLED'].includes(x.status)?x.status:'TODO', priority:['LOW','MEDIUM','HIGH','URGENT'].includes(x.priority)?x.priority:'MEDIUM', created_at: typeof x.created_at==='string'?x.created_at:nowIso(), updated_at: typeof x.updated_at==='string'?x.updated_at:nowIso(), completed_at: typeof x.completed_at==='string'?x.completed_at:undefined }
    })
    // restore per-project numbering by created order
    tasks.forEach((x,i)=>{ x.number = i+1 })
    const ideas: Idea[] = arr(data.ideas).filter((x:any)=>x && typeof x.title==='string').map((x:any)=>{
      const nid = uid(); if(typeof x.id==='string') ideaMap.set(x.id, nid)
      const conv = typeof x.converted_to_task==='string' ? taskMap.get(x.converted_to_task) : undefined
      return { id:nid, project_id:newPid, title:String(x.title).slice(0,200), description: typeof x.description==='string'?x.description.slice(0,2000):undefined, created_at: typeof x.created_at==='string'?x.created_at:nowIso(), converted_to_task: conv, status:['INBOX','CONSIDERED','PLANNED','DROPPED'].includes(x.status)?x.status:'INBOX', votes: typeof x.votes==='number'?Math.max(0,Math.floor(x.votes)):0, tags: Array.isArray(x.tags)?x.tags.filter((y:any)=>typeof y==='string').slice(0,10):[], effort:['XS','S','M','L','XL'].includes(x.effort)?x.effort:undefined }
    })
    const notes: Note[] = arr(data.notes).filter((x:any)=>x && typeof x.content==='string').map((x:any)=>({ id:uid(), project_id:newPid, content:String(x.content).slice(0,5000), created_at: typeof x.created_at==='string'?x.created_at:nowIso(), updated_at: typeof x.updated_at==='string'?x.updated_at:nowIso() }))
    const sessions: Session[] = arr(data.sessions).filter((x:any)=>x && typeof x.goal==='string').map((x:any)=>({ id:uid(), project_id:newPid, goal:String(x.goal).slice(0,200), summary: typeof x.summary==='string'?x.summary.slice(0,2000):undefined, started_at: typeof x.started_at==='string'?x.started_at:nowIso(), ended_at: typeof x.ended_at==='string'?x.ended_at:undefined, tasks_completed: Array.isArray(x.tasks_completed)?x.tasks_completed.map((y:any)=>taskMap.get(String(y))).filter(Boolean):[], notes: typeof x.notes==='string'?x.notes.slice(0,5000):'', is_paused:false, paused_ms:0 }))
    const activities: Activity[] = arr(data.activities).filter((x:any)=>x && typeof x.description==='string').map((x:any)=>({ id:uid(), project_id:newPid, type:'project_scanned', description:String(x.description).slice(0,500), created_at: typeof x.created_at==='string'?x.created_at:nowIso() }))
    const project: Project = {
      id:newPid, code, name:String(src.name).slice(0,120), description: typeof src.description==='string'?src.description.slice(0,2000):'',
      type, status, local_path: typeof src.local_path==='string'?src.local_path.slice(0,500):'',
      progress: calcProgress(tasks), created_at: typeof src.created_at==='string'?src.created_at:nowIso(), updated_at: nowIso(),
      git_repository: typeof src.git_repository==='string'?src.git_repository:undefined,
      default_branch: typeof src.default_branch==='string'?src.default_branch:undefined,
      branch: typeof src.branch==='string'?src.branch:undefined,
      last_commit: typeof src.last_commit==='string'?src.last_commit:undefined,
      commits_this_week: typeof src.commits_this_week==='number'?src.commits_this_week:undefined,
      changes_modified: typeof src.changes_modified==='number'?src.changes_modified:undefined,
      changes_untracked: typeof src.changes_untracked==='number'?src.changes_untracked:undefined,
      languages: Array.isArray(src.languages)?src.languages.filter((x:any)=>x && typeof x.language==='string').map((x:any)=>({ id:uid(), project_id:newPid, language:String(x.language).slice(0,40), percentage: typeof x.percentage==='number'?x.percentage:0, bytes: typeof x.bytes==='number'?x.bytes:0 })) : [],
      technologies: Array.isArray(src.technologies)?src.technologies.filter((x:any)=>typeof x==='string').slice(0,20):[],
    }
    set({
      projects:[...st.projects, project],
      tasks:[...st.tasks, ...tasks],
      ideas:[...st.ideas, ...ideas],
      notes:[...st.notes, ...notes],
      sessions:[...st.sessions, ...sessions],
      activities:[{ id:uid(), project_id:newPid, type:'project_scanned', description:`Imported project ${code}`, created_at:nowIso() }, ...st.activities, ...activities],
    })
    return {ok:true, code}
  },
  globalSearch:(q)=>{
    const s=get()
    if(!q.trim()) return []
    const low=q.toLowerCase()
    const res:SearchResult[]=[]
    for(const p of s.projects){
      if(p.name.toLowerCase().includes(low) || p.code.toLowerCase().includes(low) || p.description.toLowerCase().includes(low)){
        res.push({ type:'project', id:p.id, title:`${p.code} ${p.name}`, subtitle:p.description })
      }
    }
    const snippet = (text:string|undefined, max=80)=>{
      if(!text) return undefined
      const idx = text.toLowerCase().indexOf(low)
      if(idx<0) return undefined
      const start = Math.max(0, idx-24)
      return (start>0?'…':'') + text.slice(start, start+max) + (start+max<text.length?'…':'')
    }
    for(const t of s.tasks){
      if(t.title.toLowerCase().includes(low) || t.description?.toLowerCase().includes(low)){
        const proj = s.projects.find(p=>p.id===t.project_id)
        res.push({ type:'task', id:t.id, projectId:t.project_id, title:`#${String(t.number).padStart(3,'0')} ${t.title}`, subtitle: proj? `${proj.code} • ${t.status}`: t.status, match: snippet(t.description) })
      }
    }
    for(const i of s.ideas){
      const tagHit = (i.tags ?? []).some(tag=> tag.toLowerCase().includes(low))
      if(i.title.toLowerCase().includes(low) || i.description?.toLowerCase().includes(low) || tagHit){
        const proj = s.projects.find(p=>p.id===i.project_id)
        res.push({ type:'idea', id:i.id, projectId:i.project_id, title:`💡 ${i.title}`, subtitle: [proj?.code, (i.tags ?? []).map(tag=>`#${tag}`).join(' ')].filter(Boolean).join(' • '), match: snippet(i.description) })
      }
    }
    for(const n of s.notes){
      if(n.content.toLowerCase().includes(low)){
        const proj = s.projects.find(p=>p.id===n.project_id)
        res.push({ type:'note', id:n.id, projectId:n.project_id, title:n.content.slice(0,60), subtitle: proj? proj.code:'', match: snippet(n.content) })
      }
    }
    return res.slice(0,20)
  },
}),{
  name:'vibeboard-store',
  storage: createJSONStorage(()=> hybridStorage),
  partialize:(s)=> ({ projects:s.projects, tasks:s.tasks, ideas:s.ideas, notes:s.notes, sessions:s.sessions, activities:s.activities, folder:s.folder, hasOnboarded:s.hasOnboarded, locale:s.locale, customLocales:s.customLocales }),
  version:6,
  migrate: (persistedState: any, version: number)=>{
    if(version < 3){
      return {
        projects: [], tasks: [], ideas: [], notes: [], sessions: [], activities: [],
        folder: null, hasOnboarded: false, locale: persistedState?.locale ?? 'en',
        projectFilter: 'ALL', taskFilter: 'ALL', searchQuery: '',
      } as any
    }
    if(version < 4){
      const ps = persistedState as any
      ps.ideas = (ps.ideas ?? []).map((i:any)=> ({
        ...i,
        status: i.status ?? 'INBOX',
        votes: i.votes ?? 0,
        tags: i.tags ?? [],
      }))
      ps.sessions = (ps.sessions ?? []).map((s:any)=> ({
        ...s,
        notes: s.notes ?? '',
        is_paused: s.is_paused ?? false,
        paused_ms: s.paused_ms ?? 0,
      }))
      return ps
    }
    if(version < 5){
      // Чистка остатков удалённого ИИ-скоринга и мёртвого поля выбора проекта
      const ps = persistedState as any
      ps.ideas = (ps.ideas ?? []).map((i:any)=> {
        if(i && typeof i === 'object' && 'ai_score' in i){
          const { ai_score, ...rest } = i
          void ai_score
          return rest
        }
        return i
      })
      if(ps && typeof ps === 'object' && 'selectedProjectCode' in ps) delete ps.selectedProjectCode
      return ps
    }
    if(version < 6){
      const ps = persistedState as any
      if(!Array.isArray(ps.customLocales)) ps.customLocales = []
      return ps
    }
    return persistedState as any
  },
}))
