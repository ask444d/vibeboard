import { useStore } from '../store/useStore'
import { ProjectCard } from '../components/ProjectCard'
import { Link } from 'react-router-dom'
import { useT } from '../lib/useT'
import { computeHealth, healthLabelRu } from '../lib/health'
import { WeeklyChart, HealthNotifications } from '../components/AnalyticsChart'
import { AttentionWidget } from '../components/AttentionWidget'

export function Overview(){
  const projects = useStore(s=>s.projects)
  const tasks = useStore(s=>s.tasks)
  const ideas = useStore(s=>s.ideas)
  const activities = useStore(s=>s.activities)
  const t = useT()

  const stats = {
    projects: projects.length,
    active: projects.filter(p=>p.status==='ACTIVE').length,
    blocked: projects.filter(p=>p.status==='BLOCKED').length,
    tasks: tasks.length,
    ideas: ideas.length,
  }

  const activeProjects = projects.filter(p=> p.status==='ACTIVE')
  const recentTasks = tasks.filter(t=> t.status!=='DONE').slice(0,5)

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('overview.title')}</h1>
          <p className="text-sm text-zinc-500">{t('overview.subtitle')}</p>
        </div>
        <Link to="/projects" className="hidden sm:inline-flex text-sm font-medium px-4 py-2 rounded-xl border bg-white dark:bg-zinc-900">{t('overview.viewAllProjects')}</Link>
      </div>

      <HealthNotifications />
      <AttentionWidget />
      <WeeklyChart />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t('overview.statsProjects')} value={stats.projects} sub={`${stats.active} ${t('sidebar.active')} · ${stats.blocked} ${t('status.BLOCKED')}`} />
        <Stat label={t('overview.statsActive')} value={stats.active} sub={`${projects.filter(p=>p.status==='PLANNING').length} ${t('status.PLANNING')}`} accent="emerald" />
        <Stat label={t('overview.statsTasks')} value={stats.tasks} sub={`${tasks.filter(t=>t.status==='DONE').length} ${t('taskStatus.DONE')}`} />
        <Stat label={t('overview.statsIdeas')} value={stats.ideas} sub={`${tasks.filter(t=>t.status==='IN_PROGRESS').length} ${t('taskStatus.IN_PROGRESS')}`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t('overview.activeProjects')}</h2>
            <span className="text-xs text-zinc-500">{activeProjects.length} {t('overview.projectsCount')}</span>
          </div>
          {activeProjects.length===0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center bg-white dark:bg-zinc-900">
              <div className="text-sm font-medium">{t('overview.noActive')}</div>
              <p className="text-sm text-zinc-500 mt-1">{t('overview.noActiveDesc')}</p>
              <Link to="/projects" className="inline-flex mt-3 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm">{t('overview.goToProjects')}</Link>
            </div>
          ):(
            <div className="grid sm:grid-cols-2 gap-4">
              {activeProjects.map(p=> (
                <ProjectCard key={p.id} project={p} tasks={tasks.filter(t=>t.project_id===p.id)} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
            <h3 className="font-semibold text-sm">{t('overview.upNext')}</h3>
            <div className="mt-3 space-y-2">
              {recentTasks.length===0? <div className="text-sm text-zinc-500">{t('overview.noPending')}</div> : recentTasks.map(tt=>{
                const proj = projects.find(p=>p.id===tt.project_id)
                return (
                  <div key={tt.id} className="flex gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700">
                    <span className="text-xs font-mono text-zinc-500">#{String(tt.number).padStart(3,'0')}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{tt.title}</div>
                      <div className="text-xs text-zinc-500">{proj?.code} · {t(`taskStatus.${tt.status}`)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
            <h3 className="font-semibold text-sm">{t('overview.activity')}</h3>
            <div className="mt-3 space-y-3">
              {activities.slice(0,6).map(a=>{
                const proj = projects.find(p=>p.id===a.project_id)
                return (
                  <div key={a.id} className="flex gap-3 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600 mt-2 shrink-0"/>
                    <div className="min-w-0">
                      <div className="truncate">{a.description}</div>
                      <div className="text-xs text-zinc-500">{proj?.code} · {new Date(a.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <Link to="/activity" className="block mt-4 text-sm text-violet-600 hover:underline">{t('overview.viewAllActivity')}</Link>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
        <h3 className="font-semibold">Project health — пункт 6</h3>
        <p className="text-xs text-zinc-500">Оценка: прогресс · блокеры · свежесть · git. Рассчитывается локально, без сервера.</p>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {projects.length===0? <div className="col-span-full text-sm text-zinc-500 border border-dashed rounded-xl p-6 text-center">Пока нет проектов — добавь папку чтобы увидеть здоровье</div> : projects.map(p=>{
            const h = computeHealth(p, tasks.filter(tt=>tt.project_id===p.id))
            return (
              <div key={p.id} className="flex flex-col gap-2 p-3 rounded-xl border bg-zinc-50/50 dark:bg-zinc-800/50">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-500">{p.code}</span>
                  <span className="font-medium truncate">{p.name}</span>
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full text-white ${h.color}`}>{h.score}%</span>
                </div>
                <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${h.score}%`, background: h.color.includes('emerald')?'#10b981': h.color.includes('red')?'#ef4444': h.color.includes('amber')?'#f59e0b':'#eab308'}}/></div>
                <div className="flex justify-between text-[11px]"><span className="font-medium">{healthLabelRu(h.labelKey)}</span><span className="text-zinc-500 truncate">{h.details}</span></div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
        <h3 className="font-semibold">{t('overview.stackAtGlance')}</h3>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {projects.map(p=> (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border bg-zinc-50/50 dark:bg-zinc-800/50">
              <span className="font-mono text-xs text-zinc-500">{p.code}</span>
              <span className="font-medium truncate">{p.name}</span>
              <span className="ml-auto text-xs flex items-center gap-1">
                {p.languages.slice(0,3).map(l=> <span key={l.language} className="w-2 h-2 rounded-full inline-block" style={{background: l.language==='TypeScript'? '#3178c6': l.language==='Dart'? '#00B4AB': l.language==='C#'?'#178600':'#888'}}/>)}
              </span>
              <span className="text-xs text-zinc-500">{p.progress}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({label, value, sub, accent}:{label:string,value:number,sub:string,accent?:string}){
  return (
    <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
      <div className="text-xs tracking-widest font-semibold text-zinc-500 uppercase">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${accent==='emerald'?'text-emerald-600':''}`}>{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{sub}</div>
    </div>
  )
}
