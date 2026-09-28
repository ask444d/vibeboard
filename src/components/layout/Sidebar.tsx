import { NavLink, useLocation } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { useT } from '../../lib/useT'

const navDefs = [
  { to:'/', key:'sidebar.overview', icon:'⌂', exact:true },
  { to:'/projects', key:'sidebar.projects', icon:'◈' },
  { to:'/tasks', key:'sidebar.tasks', icon:'✓' },
  { to:'/sessions', key:'sidebar.sessions', icon:'◷' },
  { to:'/ideas', key:'sidebar.ideas', icon:'◆' },
  { to:'/activity', key:'sidebar.activity', icon:'◎' },
  { to:'/settings', key:'sidebar.settings', icon:'⚙' },
]

export function Sidebar({ collapsed, onClose }: { collapsed?:boolean, onClose?:()=>void }){
  const projects = useStore(s=>s.projects)
  const active = projects.filter(p=>p.status==='ACTIVE').length
  const paused = projects.filter(p=>p.status==='PAUSED').length
  const completed = projects.filter(p=>p.status==='COMPLETED').length
  const location = useLocation()
  const isProjects = location.pathname.startsWith('/projects')
  const t = useT()
  return (
    <aside className={`${collapsed?'hidden lg:flex':''} w-[260px] shrink-0 border-r bg-white dark:bg-zinc-900 flex flex-col h-screen sticky top-0`}>
      <div className="px-5 py-5 border-b flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">V</div>
        <div>
          <div className="font-semibold tracking-tight">VibeBoard</div>
          <div className="text-xs text-zinc-500 -mt-0.5">{t('sidebar.commandCenter')}</div>
        </div>
        {onClose && <button onClick={onClose} className="ml-auto lg:hidden text-zinc-400">✕</button>}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navDefs.map(item=> (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({isActive})=> `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive?'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900':'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}
          >
            <span className="w-5 text-center text-xs">{item.icon}</span>{t(item.key)}
          </NavLink>
        ))}

        {isProjects || true ? (
          <div className="pt-4">
            <div className="px-3 text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">{t('sidebar.projectsGroup')}</div>
            <div className="mt-2 space-y-1 px-1">
              <NavLink to="/projects?filter=ALL" className="flex justify-between px-2 py-1.5 text-sm rounded hover:bg-zinc-50 dark:hover:bg-zinc-800"><span className="text-zinc-600 dark:text-zinc-400">{t('sidebar.all')}</span><span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{projects.length}</span></NavLink>
              <NavLink to="/projects?filter=ACTIVE" className="flex justify-between px-2 py-1.5 text-sm rounded hover:bg-zinc-50 dark:hover:bg-zinc-800"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"/>{t('sidebar.active')}</span><span className="text-xs">{active}</span></NavLink>
              <NavLink to="/projects?filter=PAUSED" className="flex justify-between px-2 py-1.5 text-sm rounded hover:bg-zinc-50 dark:hover:bg-zinc-800"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-zinc-400"/>{t('sidebar.paused')}</span><span className="text-xs">{paused}</span></NavLink>
              <NavLink to="/projects?filter=COMPLETED" className="flex justify-between px-2 py-1.5 text-sm rounded hover:bg-zinc-50 dark:hover:bg-zinc-800"><span className="flex items-center gap-2">✅ {t('sidebar.completed')}</span><span className="text-xs">{completed}</span></NavLink>
            </div>
          </div>
        ):null}
      </nav>

      <div className="p-3 border-t">
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-3">
          <div className="text-xs font-medium">{t('sidebar.localFirst')}</div>
          <div className="text-xs text-zinc-500 leading-snug mt-1">{t('sidebar.localFirstDesc')}</div>
          <div className="mt-2 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden"><div className="h-full w-3/4 bg-violet-600 rounded-full"/></div>
        </div>
      </div>
    </aside>
  )
}

export function MobileBottomNav(){
  const t = useT()
  const items = [
    {to:'/', key:'sidebar.overview', icon:'⌂'},
    {to:'/projects', key:'sidebar.projects', icon:'◈'},
    {to:'/tasks', key:'sidebar.tasks', icon:'✓'},
    {to:'/ideas', key:'sidebar.ideas', icon:'◆'},
    {to:'/settings', key:'sidebar.settings', icon:'⚙'},
  ]
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-t flex justify-around py-2 z-40">
      {items.map(i=> (
        <NavLink key={i.to} to={i.to} end={i.to==='/' } className={({isActive})=> `flex flex-col items-center text-xs px-3 py-1 rounded-lg ${isActive?'text-violet-600':'text-zinc-500'}`}>
          <span className="text-base">{i.icon}</span>{t(i.key)}
        </NavLink>
      ))}
    </nav>
  )
}
