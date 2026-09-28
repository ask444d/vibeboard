import { useState } from 'react'
import { useStore } from '../store/useStore'
import { scanDirectoryHandle } from '../lib/utils'

export function Onboarding({ onDone }: {onDone:()=>void}){
  const setFolder = useStore(s=>s.setFolder)
  const scanProjects = useStore(s=>s.scanProjects)
  const [scanning, setScanning]=useState(false)
  const [found, setFound]=useState<{name:string, files:string[], hasGit:boolean}[]|null>(null)
  const [selected, setSelected]=useState<Set<string>>(new Set())
  const [path, setPath]=useState('~/Projects')
  const [error, setError]=useState<string|null>(null)

  const handleSelectFolder = async()=>{
    setError(null)
    if('showDirectoryPicker' in window){
      try{
        // @ts-ignore
        const handle = await (window as any).showDirectoryPicker({mode:'read'})
        setScanning(true)
        setPath(handle.name)
        const { projectsFound } = await scanDirectoryHandle(handle)
        if(!projectsFound.length){
          setError('No projects found in selected folder. Create one manually or try another folder.')
        }
        setFound(projectsFound)
        setSelected(new Set(projectsFound.map(p=>p.name)))
        setScanning(false)
        return
      }catch(e:any){
        if(e?.name==='AbortError') return
        setError(e?.message ?? 'Failed to read folder')
        setScanning(false)
      }
    } else {
      setError('File System Access API not supported in this browser. Create projects manually after skipping.')
    }
  }

  const handleAdd = ()=>{
    if(!found) return
    const toAdd = found.filter(f=> selected.has(f.name))
    setFolder(`~/${path}`)
    scanProjects(toAdd as any)
    onDone()
  }

  const skip = ()=>{
    // clean start — no demo data
    setFolder('~/Projects')
    onDone()
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-[640px]">
        <div className="bg-white dark:bg-zinc-900 border rounded-3xl p-8 md:p-10 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold">V</div>
          <h1 className="text-3xl font-bold tracking-tight mt-6">VibeBoard</h1>
          <p className="text-zinc-500 mt-2">Track all your coding projects. One command center for vibe coding.</p>

          {!found ? (
            <>
              <div className="mt-8 rounded-2xl border bg-zinc-50 dark:bg-zinc-800/50 p-6 text-center">
                <div className="text-sm font-medium">Choose your projects folder</div>
                <div className="text-xs text-zinc-500 mt-1">VibeBoard will scan it locally. No code leaves your machine.</div>
                <button onClick={handleSelectFolder} disabled={scanning} className="mt-5 px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {scanning?'Scanning…':'Select folder'}
                </button>
                <div className="mt-3 text-xs font-mono text-zinc-400">Example: ~/Projects/</div>
                {error && <div className="mt-3 text-xs text-red-600">{error}</div>}
                <div className="mt-4 text-xs text-zinc-400">No fake data will be created — you start with an empty board.</div>
              </div>
              <button onClick={skip} className="mt-4 w-full text-sm text-zinc-500 hover:text-zinc-700">Skip — start empty →</button>
              <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border p-3 bg-white dark:bg-zinc-900">🔒 Local-first<br/><span className="text-zinc-500">No upload</span></div>
                <div className="rounded-xl border p-3 bg-white dark:bg-zinc-900">⚡ Auto-detect<br/><span className="text-zinc-500">Git & stack</span></div>
                <div className="rounded-xl border p-3 bg-white dark:bg-zinc-900">📊 Live progress<br/><span className="text-zinc-500">From tasks</span></div>
              </div>
            </>
          ):(
            <>
              <div className="mt-6 flex items-center justify-between">
                <h2 className="font-semibold">Found {found.length} projects</h2>
                <span className="text-xs font-mono text-zinc-500">{path}</span>
              </div>
              <div className="mt-3 border rounded-2xl divide-y max-h-72 overflow-auto">
                {found.map(f=> (
                  <label key={f.name} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                    <input type="checkbox" checked={selected.has(f.name)} onChange={e=>{
                      const n=new Set(selected)
                      if(e.target.checked) n.add(f.name); else n.delete(f.name)
                      setSelected(n)
                    }} className="rounded" />
                    <span className="flex-1 text-sm font-medium">{f.name}</span>
                    <span className="text-xs text-zinc-500 truncate">{f.files.slice(0,3).join(' · ')}</span>
                    {f.hasGit && <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">git</span>}
                  </label>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={handleAdd} disabled={selected.size===0} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50">Add selected ({selected.size})</button>
                <button onClick={skip} className="px-5 py-2.5 rounded-xl border bg-white dark:bg-zinc-800 text-sm">Skip</button>
              </div>
              <p className="mt-3 text-xs text-zinc-500">Duplicates won’t be added. You can rescan later in Settings.</p>
            </>
          )}
        </div>
        <div className="text-center text-xs text-zinc-400 mt-4">Apple + Linear style · Dark/Light · Responsive</div>
      </div>
    </div>
  )
}
