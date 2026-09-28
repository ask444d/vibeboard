import { uid, nowIso, analyzeLanguages, detectTechStack, syntheticFilesForProject, generateProjectCode } from './utils'
import type { Project, Task, Idea, Note, Session, Activity } from './types'

function isoHoursAgo(h: number){ return new Date(Date.now()-h*3600000).toISOString() }
function isoMinutesAgo(m: number){ return new Date(Date.now()-m*60000).toISOString() }

export function createSeedData(): {projects:Project[], tasks:Task[], ideas:Idea[], notes:Note[], sessions:Session[], activities:Activity[], folder:string}{
  const folder = '~/Projects'
  const projs: Project[] = []
  const tasks: Task[] = []
  const ideas: Idea[] = []
  const notes: Note[] = []
  const sessions: Session[] = []
  const activities: Activity[] = []

  const defs: {name:string, type:Project['type'], status:Project['status'], desc:string, branch:string, changes:number, untracked:number, commits:number, lastCommitMinutes:number}[] = [
    {name:'VibeBoard', type:'WEB', status:'ACTIVE', desc:'Personal project tracker for vibe coding', branch:'main', changes:5, untracked:2, commits:12, lastCommitMinutes:18 },
    {name:'MedRef', type:'APP', status:'PAUSED', desc:'Medical reference app with drug search', branch:'develop', changes:3, untracked:1, commits:8, lastCommitMinutes: 320 },
    {name:'VELMARA', type:'GAME', status:'ACTIVE', desc:'Atmospheric exploration game', branch:'main', changes:12, untracked:4, commits: 22, lastCommitMinutes: 45 },
    {name:'TelegramBot', type:'BOT', status:'PLANNING', desc:'Telegram bot for notifications', branch:'main', changes:0, untracked:3, commits:3, lastCommitMinutes: 1440 },
    {name:'AI-Assistant', type:'AI', status:'TESTING', desc:'AI assistant with local LLMs', branch:'feature/rag', changes:7, untracked:0, commits: 15, lastCommitMinutes: 90 },
    {name:'SomeWebsite', type:'WEB', status:'BLOCKED', desc:'Landing page for startup', branch:'main', changes:2, untracked:1, commits: 5, lastCommitMinutes: 720 },
  ]

  for(const d of defs){
    const code = generateProjectCode(d.type, projs as any)
    const files = syntheticFilesForProject(d.type, d.name)
    const langs = analyzeLanguages(files)
    // infer techs heuristically
    const techMap: Record<string,string[]> = {
      VibeBoard: ['TypeScript','React','Next.js','Tailwind CSS','Vite'],
      MedRef: ['Flutter','Dart'],
      VELMARA: ['C#','Unity','HLSL'],
      TelegramBot: ['Python','aiogram'],
      'AI-Assistant': ['Python','TypeScript','React','FastAPI'],
      SomeWebsite: ['JavaScript','Tailwind CSS','Vite'],
    }
    const techs = techMap[d.name] ?? detectTechStack([], undefined)
    const p: Project = {
      id: uid(),
      code,
      name: d.name,
      description: d.desc,
      type: d.type,
      status: d.status,
      local_path: `${folder}/${d.name}`,
      progress: 0,
      created_at: isoHoursAgo(72 + Math.random()*100),
      updated_at: isoMinutesAgo(d.lastCommitMinutes),
      git_repository: `github.com/you/${d.name}`,
      default_branch: 'main',
      branch: d.branch,
      last_commit: isoMinutesAgo(d.lastCommitMinutes),
      commits_this_week: d.commits,
      changes_modified: d.changes,
      changes_untracked: d.untracked,
      languages: langs.map(l=>({ ...l, project_id: '' })),
      technologies: techs,
    }
    langs.forEach(l=> l.project_id = p.id)
    projs.push(p)

    // tasks per project
    const taskTitles: Record<string,string[]> = {
      VibeBoard:['Create dashboard','Create project page','Project creation','Settings','Onboarding flow','File System API integration','Language bar component','Tech stack detection','Search & filters','Dark mode','Responsive layout','Session tracking','Ideas board','Git info panel','Polish & deploy'],
      MedRef:['Drug search','Offline storage','Sync service','UI redesign','Onboarding'],
      VELMARA:['World generation','Shader system','Inventory','Quest engine','Audio integration','Multiplayer prototype'],
      TelegramBot:['Bot scaffold','Command handler','Database','Deploy'],
      'AI-Assistant':['RAG pipeline','Vector store','Chat UI','Model switcher','Evaluation'],
      SomeWebsite:['Hero section','Pricing','Contact form','Analytics'],
    }
    const titles = taskTitles[d.name] ?? ['Setup','Feature A','Feature B']
    titles.forEach((title, idx)=>{
      const num = idx+1
      let status: Task['status'] = 'TODO'
      if(d.name==='VibeBoard'){
        if(idx<2) status='DONE'
        else if(idx===2) status='IN_PROGRESS'
        else if(idx===6) status='REVIEW'
        else if(idx===9) status='DONE'
        else if(idx===13) status='BLOCKED'
      } else {
        // random
        const r = Math.random()
        if(r<0.4) status='DONE'
        else if(r<0.6) status='IN_PROGRESS'
        else if(r<0.75) status='TODO'
        else if(r<0.85) status='REVIEW'
        else status='BLOCKED'
      }
      const t: Task = {
        id: uid(),
        project_id: p.id,
        number: num,
        title,
        description: idx===2? 'Implement creation modal, validation and project type selection.':'',
        status,
        priority: idx%3===0?'HIGH': idx%3===1?'MEDIUM':'LOW',
        created_at: isoHoursAgo(20+idx*2),
        updated_at: isoMinutesAgo(d.lastCommitMinutes + idx*5),
        completed_at: status==='DONE'? isoMinutesAgo(30+idx*10): undefined,
      }
      tasks.push(t)
    })
    // update project progress
    const projTasks = tasks.filter(t=> t.project_id===p.id)
    p.progress = Math.round(projTasks.filter(t=> t.status==='DONE').length / projTasks.length*100)

    // ideas
    const ideaTitles: Record<string,string[]> = {
      VibeBoard:['GitHub integration','Mobile application','AI summaries','Command palette','Desktop app with Tauri'],
      MedRef:['Pill scanner','Offline AI'],
      VELMARA:['Procedural dungeons','Weather system'],
      'AI-Assistant':['Voice mode','Memory graph'],
    }
    const iTitles = ideaTitles[d.name] ?? (Math.random()>0.5? ['Nice to have']: [])
    iTitles.forEach(tt=>{
      const tags = tt.toLowerCase().includes('github') ? ['github','sync'] : tt.toLowerCase().includes('ai') ? ['ai'] : []
      ideas.push({ id:uid(), project_id:p.id, title:tt, description:'', created_at: isoHoursAgo(Math.random()*40), status: Math.random()>0.5?'INBOX':'CONSIDERED', votes: Math.floor(Math.random()*5), tags, effort: (['S','M','L'] as any)[Math.floor(Math.random()*3)]})
    })

    // notes
    if(d.name==='VibeBoard'){
      notes.push({ id:uid(), project_id:p.id, content:'Need to redesign project cards. Consider SQLite for local-first version. Authentication should be optional.', created_at: isoHoursAgo(5), updated_at: isoHoursAgo(2)})
      notes.push({ id:uid(), project_id:p.id, content:'File System Access API is Chromium-only — fallback to manual add + drag&drop for other browsers.', created_at: isoHoursAgo(10), updated_at: isoHoursAgo(10)})
    } else if(d.name==='VELMARA'){
      notes.push({ id:uid(), project_id:p.id, content:'Try HDRP for wet surfaces. Performance budget: 16ms frame.', created_at: isoHoursAgo(12), updated_at: isoHoursAgo(12)})
    } else if(d.name==='MedRef'){
      notes.push({ id:uid(), project_id:p.id, content:'Check drug interactions API; handle offline gracefully.', created_at: isoHoursAgo(8), updated_at: isoHoursAgo(8)})
    }

    // sessions
    if(d.name==='VibeBoard'){
      sessions.push({ id:uid(), project_id:p.id, goal:'Finish project creation', started_at: isoHoursAgo(3), ended_at: isoMinutesAgo(18), summary:'Implemented project creation, validation and type selection.', tasks_completed: tasks.filter(t=> t.project_id===p.id && t.status==='DONE').slice(0,2).map(t=>t.id), notes:'[12:00] Setup\n[12:30] Done', is_paused:false, paused_ms:0})
      sessions.push({ id:uid(), project_id:p.id, goal:'Language bar polish', started_at: isoHoursAgo(26), ended_at: isoHoursAgo(24.5), summary:'Built GitHub-style bar with stable colors.', tasks_completed: [], notes:'', is_paused:false, paused_ms:0})
    }

    // activities
    const acts: Omit<Activity,'id'>[] = [
      { project_id:p.id, type:'created_task', description:`Created task #${projTasks.length} ${projTasks[projTasks.length-1]?.title ?? ''}`, created_at: isoMinutesAgo(30)},
      { project_id:p.id, type:'completed_task', description:`Completed task #${projTasks.filter(t=>t.status==='DONE')[0]?.number ?? 1}`, created_at: isoMinutesAgo(80)},
      { project_id:p.id, type:'status_change', description:`Changed status to ${d.status}`, created_at: isoHoursAgo(5)},
    ]
    if(d.name==='VibeBoard') acts.push({ project_id:p.id, type:'added_idea', description:`Added idea "GitHub integration"`, created_at: isoHoursAgo(21)})
    acts.forEach(a=> activities.push({ id:uid(), ...a }))
  }

  // global activities sorted desc
  activities.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return { projects: projs, tasks, ideas, notes, sessions, activities, folder }
}
