import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { ProjectCard } from '../components/ProjectCard'
import type { ProjectStatus, ProjectType } from '../lib/types'
import { useSearchParams } from 'react-router-dom'
import { useT } from '../lib/useT'
import { readFolderHandle, scanDirectoryHandle } from '../lib/utils'

export function ProjectsPage(){
  const projects = useStore(s=>s.projects)
  const tasks = useStore(s=>s.tasks)
  const addProject = useStore(s=>s.addProject)
  const addProjectFromFolder = useStore(s=>s.addProjectFromFolder)
  const scanProjects = useStore(s=>s.scanProjects)
  const folder = useStore(s=>s.folder)
  const setFolder = useStore(s=>s.setFolder)
  const t = useT()
  const [filter, setFilter] = useState<ProjectStatus|'ALL'>('ALL')
  const [q, setQ]=useState('')
  const [showCreate, setShowCreate]=useState(false)
  const [scanningRoot, setScanningRoot]=useState(false)
  const [scanFound, setScanFound]=useState<{name:string, files:string[], hasGit:boolean, packageJson?:any}[]|null>(null)
  const [scanSelected, setScanSelected]=useState<Set<string>>(new Set())
  const [searchParams]=useSearchParams()
  const urlFilter = searchParams.get('filter') as ProjectStatus|'ALL'|null
  const activeFilter = (urlFilter ?? filter) as ProjectStatus|'ALL'

  const handleScanRoot = async()=>{
    if('showDirectoryPicker' in window){
      try{
        // @ts-ignore
        const handle = await (window as any).showDirectoryPicker({mode:'read'})
        setScanningRoot(true)
        setFolder(`~/${handle.name}`)
        const { projectsFound } = await scanDirectoryHandle(handle)
        setScanFound(projectsFound)
        setScanSelected(new Set(projectsFound.map(p=>p.name)))
        setScanningRoot(false)
        return
      }catch(e:any){
        if(e?.name==='AbortError'){ setScanningRoot(false); return }
      }
    }
    alert(t('settings.projectsFolderDesc'))
    setScanningRoot(false)
  }

  const handleAddFolder = async()=>{
    if('showDirectoryPicker' in window){
      try{
        // @ts-ignore
        const handle = await (window as any).showDirectoryPicker({mode:'read'})
        try{
          await addProjectFromHandle(handle)
        }catch(e:any){ alert(e?.message ?? 'Failed to add project') }
        return
      }catch(e:any){
        if(e?.name==='AbortError') return
        alert(e?.message ?? 'Failed to read folder')
        return
      }
    }
    const path = prompt(t('projects.manualPathPlaceholder') + '\n' + t('projects.manualPath') + ':')
    if(!path) return
    const name = path.split('/').filter(Boolean).pop() || 'NewProject'
    try{
      addProjectFromFolder({ name, files:[], hasGit:false, customPath: path })
    }catch(e:any){ alert(e?.message) }
  }

  const filtered = useMemo(()=>{
    let lst = projects
    if(activeFilter!=='ALL') lst = lst.filter(p=> p.status===activeFilter)
    if(q) lst = lst.filter(p=> p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase()))
    return lst.sort((a,b)=> new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  },[projects, activeFilter, q])

  const [isDragOver, setIsDragOver]=useState(false)
  const addProjectFromHandle = useStore(s=>s.addProjectFromHandle)

  const handleDrop = async(e:React.DragEvent)=>{
    e.preventDefault(); setIsDragOver(false)
    const items = Array.from(e.dataTransfer.items)
    let added=0
    for(const item of items){
      try{
        const handle = (item as any).getAsFileSystemHandle ? await (item as any).getAsFileSystemHandle() : null
        if(handle && handle.kind==='directory'){
          await addProjectFromHandle(handle)
          added++
        } else if((item as any).webkitGetAsEntry){
          const entry = (item as any).webkitGetAsEntry()
          if(entry && entry.isDirectory){
            // fallback: prompt manual
            const name = entry.name
            try{ addProjectFromFolder({name, files:[], hasGit:false}) ; added++ }catch{}
          }
        }
      }catch(err:any){ console.warn(err) }
    }
    if(added===0){
      alert('Перетащи папку проекта (directory), а не файлы. Или используй кнопку Добавить папку.')
    }
  }

  return (
    <div className="space-y-5 animate-in" onDragOver={e=>{e.preventDefault(); setIsDragOver(true)}} onDragLeave={()=> setIsDragOver(false)} onDrop={handleDrop}>
      {isDragOver && (
        <div className="fixed inset-0 z-40 bg-violet-600/10 backdrop-blur-sm border-2 border-dashed border-violet-600 rounded-3xl m-4 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-zinc-900 border rounded-2xl px-6 py-4 shadow-xl text-center">
            <div className="text-lg font-semibold">Отпусти папку — добавлю как проект</div>
            <div className="text-xs text-zinc-500">Поддерживается реальный анализ языков по байтам + .vibeboard.json</div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('projects.title')}</h1>
          <p className="text-sm text-zinc-500">{projects.length} {t('projects.total')} · {filtered.length} {t('projects.shown')} · {folder ?? t('settings.projectsFolder')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleScanRoot} disabled={scanningRoot} className="px-3 py-2 rounded-xl border bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-zinc-50">{scanningRoot? '…': `⌖ ${t('projects.scanRoot')}`}</button>
          <button onClick={handleAddFolder} className="px-3 py-2 rounded-xl border bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-zinc-50">📁 {t('projects.addFolder')}</button>
          <button onClick={()=> setShowCreate(true)} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700">+ {t('projects.new')}</button>
        </div>
      </div>

      <div
        onDragOver={e=>{e.preventDefault(); setIsDragOver(true)}}
        className={`rounded-2xl border-2 border-dashed p-4 flex items-center gap-3 ${isDragOver?'bg-violet-50 dark:bg-violet-950/20 border-violet-400':'bg-white dark:bg-zinc-900'}`}
      >
        <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border flex items-center justify-center">📂</div>
        <div className="flex-1">
          <div className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">{t('projects.addFolderDesc')}</div>
          <div className="mt-1 text-xs text-zinc-500">Перетащи папку сюда или нажми <b>{t('projects.addFolder')}</b>. Поддерживается <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">.vibeboard.json</code> для оверрайда типа/статуса/кода + реальный подсчёт языков по байтам (игнор node_modules/.git/dist).</div>
          <div className="mt-1 text-xs text-zinc-500">• <b>{t('projects.scanRoot')}</b>: {t('projects.scanRootDesc')}<br/>• <b>{t('projects.addFolder')}</b>: {t('projects.addFolderDesc')}</div>
          <details className="mt-2">
            <summary className="text-xs font-medium cursor-pointer">Пример .vibeboard.json</summary>
            <pre className="mt-2 text-[11px] font-mono bg-zinc-50 dark:bg-zinc-800 border rounded-xl p-3 overflow-auto">{`{
  "name": "MyApp",
  "type": "WEB",
  "status": "ACTIVE",
  "code": "WEB-042",
  "description": "Мой проект"
}`}</pre>
            <div className="text-[11px] text-zinc-500 mt-1">Положи в корень проекта — при добавлении папки VibeBoard прочитает его и применит. Поля опциональны.</div>
          </details>
        </div>
      </div>

      {scanFound && (
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Найдено {scanFound.length} — выбери для добавления</h3>
            <button onClick={()=> setScanFound(null)} className="text-xs px-2 py-1 rounded border">{t('common.cancel')}</button>
          </div>
          <div className="mt-3 border rounded-xl divide-y max-h-64 overflow-auto">
            {scanFound.map(f=>(
              <label key={f.name} className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <input type="checkbox" checked={scanSelected.has(f.name)} onChange={e=>{ const n=new Set(scanSelected); if(e.target.checked) n.add(f.name); else n.delete(f.name); setScanSelected(n) }} />
                <span className="text-sm font-medium flex-1">{f.name}</span>
                <span className="text-xs text-zinc-500 truncate">{f.files.slice(0,3).join(' · ')}</span>
                {f.hasGit && <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-900 text-white">git</span>}
              </label>
            ))}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={()=> setScanFound(null)} className="px-3 py-1.5 rounded-xl border text-sm">{t('common.cancel')}</button>
            <button onClick={()=>{ const toAdd = scanFound.filter(f=> scanSelected.has(f.name)); scanProjects(toAdd as any); setScanFound(null)}} className="px-4 py-1.5 rounded-xl bg-violet-600 text-white text-sm">Добавить выбранные ({scanSelected.size})</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['ALL','ACTIVE','PLANNING','PAUSED','BLOCKED','TESTING','COMPLETED','ARCHIVED'] as const).map(f=>(
          <button key={f} onClick={()=> setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${activeFilter===f?'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900':'bg-white dark:bg-zinc-900 text-zinc-600 hover:bg-zinc-50'}`}>{f==='ALL'? t('projects.filterAll'): t(`status.${f}`)}</button>
        ))}
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('projects.filterBy')} className="ml-auto px-3 py-1.5 rounded-full border bg-white dark:bg-zinc-900 text-sm w-full sm:w-64" />
      </div>

      {filtered.length===0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center bg-white dark:bg-zinc-900">
          <div className="text-sm font-medium">{t('projects.noProjects')}</div>
          <p className="text-sm text-zinc-500 mt-1">{t('projects.tryAnother')}</p>
        </div>
      ):(
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p=> <ProjectCard key={p.id} project={p} tasks={tasks.filter(t=>t.project_id===p.id)} />)}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={()=>setShowCreate(false)} onCreate={(data)=>{ addProject(data); setShowCreate(false)}} />}
    </div>
  )
}

function CreateProjectModal({onClose, onCreate}:{onClose:()=>void,onCreate:(d:{name:string,type:ProjectType,description:string,status:ProjectStatus, local_path?:string})=>void}){
  const t = useT()
  const [name,setName]=useState('')
  const [type,setType]=useState<ProjectType>('WEB')
  const [desc,setDesc]=useState('')
  const [status,setStatus]=useState<ProjectStatus>('PLANNING')
  const [localPath, setLocalPath]=useState('')
  const [error,setError]=useState<string|null>(null)
  const submit=()=>{
    if(!name.trim()){ setError(t('projects.create.nameRequired')); return }
    onCreate({name:name.trim(), type, description:desc, status, local_path: localPath.trim() || undefined})
  }
  const pickFolder = async()=>{
    if('showDirectoryPicker' in window){
      try{
        // @ts-ignore
        const handle = await (window as any).showDirectoryPicker({mode:'read'})
        const info = await readFolderHandle(handle)
        setName(info.name)
        // we can't get absolute OS path due to sandbox, but store handle name as hint
        setLocalPath(`~/${handle.name}/${info.name}`)
        // also try to infer type
        if(info.files.includes('pubspec.yaml')) setType('APP')
        else if(info.files.includes('Cargo.toml')) setType('TOOL')
        else if(info.files.includes('package.json')) setType('WEB')
      }catch(e:any){ if(e?.name!=='AbortError') alert(e?.message) }
    } else {
      const p = prompt(t('projects.manualPath') + ':')
      if(p) setLocalPath(p)
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-xl border">
        <h3 className="font-semibold">{t('projects.create.title')}</h3>
        <div className="mt-4 space-y-3">
          <label className="block"><span className="text-xs font-medium">{t('projects.create.name')}</span><input value={name} onChange={e=>setName(e.target.value)} placeholder={t('projects.create.placeholderName')} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-violet-500" /></label>
          <label className="block">
            <span className="text-xs font-medium flex items-center justify-between">{t('projects.manualPath')} <button type="button" onClick={pickFolder} className="text-xs px-2 py-0.5 rounded-full border bg-zinc-50 dark:bg-zinc-800">{t('projects.browse')}</button></span>
            <input value={localPath} onChange={e=>setLocalPath(e.target.value)} placeholder={t('projects.manualPathPlaceholder')} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm font-mono" />
            <span className="text-[11px] text-zinc-500 mt-1 block">Можно вписать вручную или выбрать папку. Если оставить пустым — используется {`~/Projects/`}+имя.</span>
          </label>
          <label className="block"><span className="text-xs font-medium">{t('projects.create.type')}</span>
            <select value={type} onChange={e=>setType(e.target.value as ProjectType)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm">
              <option value="WEB">WEB — {t('projectType.WEB')}</option><option value="APP">APP — {t('projectType.APP')}</option><option value="GAME">GAME — {t('projectType.GAME')}</option><option value="BOT">BOT — {t('projectType.BOT')}</option><option value="AI">AI — {t('projectType.AI')}</option><option value="TOOL">TOOL — {t('projectType.TOOL')}</option><option value="OTHER">OTHER</option>
            </select>
          </label>
          <label className="block"><span className="text-xs font-medium">{t('projects.create.description')}</span><textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={3} placeholder={t('projects.create.placeholderDesc')} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm" /></label>
          <label className="block"><span className="text-xs font-medium">{t('projects.create.status')}</span>
            <select value={status} onChange={e=>setStatus(e.target.value as ProjectStatus)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm">
              <option value="PLANNING">🔵 {t('status.PLANNING')}</option><option value="ACTIVE">🟢 {t('status.ACTIVE')}</option><option value="PAUSED">⚪ {t('status.PAUSED')}</option><option value="BLOCKED">🔴 {t('status.BLOCKED')}</option><option value="TESTING">🟣 {t('status.TESTING')}</option><option value="COMPLETED">✅ {t('status.COMPLETED')}</option><option value="ARCHIVED">🗃️ {t('status.ARCHIVED')}</option>
            </select>
          </label>
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm">{t('common.cancel')}</button>
          <button onClick={submit} className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium">{t('projects.create.submit')}</button>
        </div>
      </div>
    </div>
  )
}
