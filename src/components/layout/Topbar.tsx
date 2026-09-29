import { useState, useEffect, useMemo, useRef } from 'react'
import { useStore } from '../../store/useStore'
import { useNavigate } from 'react-router-dom'
import { getAllLocales, getCoverage } from '../../lib/i18n'
import { useT } from '../../lib/useT'
import { PWAInstall } from '../PWAInstall'

export function Topbar({ onMenu }: {onMenu?:()=>void}){
  const searchQuery = useStore(s=>s.searchQuery)
  const setSearchQuery = useStore(s=>s.setSearchQuery)
  const globalSearch = useStore(s=>s.globalSearch)
  const locale = useStore(s=>s.locale)
  const setLocale = useStore(s=>s.setLocale)
  const customLocales = useStore(s=>s.customLocales)
  const allLocales = useMemo(()=> getAllLocales(), [customLocales])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [dark, setDark] = useState<boolean>(()=> document.documentElement.classList.contains('dark'))
  const [langOpen, setLangOpen] = useState(false)
  const [online, setOnline]=useState<boolean>(()=> typeof navigator !== 'undefined' ? navigator.onLine : true)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const results = globalSearch(searchQuery)
  const t = useT()
  useEffect(()=>{
    const onOnline=()=> setOnline(true)
    const onOffline=()=> setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return ()=>{ window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline)}
  },[])

  useEffect(()=>{ setActiveIdx(0) },[searchQuery])

  const openResult = (r: typeof results[number])=>{
    setOpen(false)
    if(r.type==='project'){
      const proj = useStore.getState().projects.find(p=>p.id===r.id)
      if(proj) navigate(`/projects/${proj.code}`)
    } else if(r.projectId){
      const proj = useStore.getState().projects.find(p=>p.id===r.projectId)
      if(!proj) return
      const tab = r.type==='task' ? 'tasks' : r.type==='idea' ? 'ideas' : 'notes'
      navigate(`/projects/${proj.code}?tab=${tab}&focus=${r.id}`)
    }
  }

  useEffect(()=>{
    const onKey = (e:KeyboardEvent)=>{
      if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); inputRef.current?.focus(); setOpen(true)}
      if(e.key==='Escape') setOpen(false)
      if(!open || !searchQuery || results.length===0) return
      if(e.key==='ArrowDown'){ e.preventDefault(); setActiveIdx(i=> (i+1)%results.length) }
      if(e.key==='ArrowUp'){ e.preventDefault(); setActiveIdx(i=> (i-1+results.length)%results.length) }
      if(e.key==='Enter' && results[activeIdx]){ e.preventDefault(); openResult(results[activeIdx]) }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  })

  const toggleDark = ()=>{
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('vb-theme', next? 'dark':'light')
  }
  useEffect(()=>{
    const saved = localStorage.getItem('vb-theme')
    if(saved==='dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)){
      document.documentElement.classList.add('dark')
      setDark(true)
    }
  },[])

  return (
    <header className="sticky top-0 z-30 bg-white/70 dark:bg-zinc-900/70 backdrop-blur border-b">
      <div className="flex items-center gap-3 px-4 lg:px-6 py-3 w-full">
        <button onClick={onMenu} className="lg:hidden p-2 -ml-2 text-zinc-600 shrink-0">☰</button>
        <div className="flex-1 relative min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">⌕</span>
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={e=>{ setSearchQuery(e.target.value); setOpen(true)}}
            onFocus={()=> setOpen(true)}
            onBlur={()=> setTimeout(()=> setOpen(false),200)}
            placeholder={t('search.placeholder')}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
          {open && searchQuery && (
            <div className="absolute mt-2 w-full bg-white dark:bg-zinc-900 border rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto">
              {results.length===0? <div className="p-4 text-sm text-zinc-500">{t('search.noResults')}</div> : results.map((r,idx)=>(
                <button
                  key={r.type+'-'+r.id}
                  onMouseEnter={()=> setActiveIdx(idx)}
                  onClick={()=> openResult(r)}
                  className={`w-full text-left px-4 py-2.5 flex justify-between gap-3 ${idx===activeIdx?'bg-violet-50 dark:bg-violet-950/30':'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                >
                  <div className="min-w-0"><div className="text-sm font-medium truncate">{r.title}</div><div className="text-xs text-zinc-500 truncate">{r.subtitle}</div>{r.match && <div className="text-xs text-zinc-400 truncate italic">“{r.match}”</div>}</div>
                  <span className="text-[10px] uppercase tracking-wide bg-zinc-100 dark:bg-zinc-800 px-1.5 py-1 rounded h-fit shrink-0">{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!online && <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">● Offline</span>}
          <PWAInstall />
          <div className="relative">
            <button onClick={()=> setLangOpen(v=>!v)} className="h-9 px-2.5 rounded-xl border bg-white dark:bg-zinc-800 flex items-center gap-1.5 text-xs font-medium">
              <span>{allLocales.find(l=>l.code===locale)?.flag ?? '🌐'}</span>
              <span className="hidden sm:inline">{allLocales.find(l=>l.code===locale)?.label ?? locale}</span>
              <span className="text-zinc-400">▾</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border rounded-xl shadow-xl overflow-hidden z-50">
                {allLocales.map(l=>(
                  <button
                    key={l.code}
                    onClick={()=>{ setLocale(l.code); setLangOpen(false)}}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${locale===l.code?'bg-zinc-50 dark:bg-zinc-800 font-medium':''}`}
                  >
                    <span>{l.flag}</span><span className="flex-1">{l.label}</span><span className="text-xs text-zinc-500">{getCoverage(l.code)}%</span> {locale===l.code && <span className="text-violet-600">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={toggleDark} className="w-9 h-9 rounded-xl border bg-white dark:bg-zinc-800 flex items-center justify-center text-sm shrink-0">{dark?'☀':'☾'}</button>
        </div>
      </div>
    </header>
  )
}
