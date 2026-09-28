import { useStore } from '../store/useStore'
import { formatRelative } from '../lib/utils'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AgentSendButtons } from '../components/AgentSendButtons'

function durationStr(s: any){
  const start = new Date(s.started_at).getTime()
  const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now()
  const paused = s.paused_ms ?? 0 + (s.is_paused && s.paused_at ? Date.now()- new Date(s.paused_at).getTime() : 0)
  const ms = Math.max(0, end - start - paused)
  const mins = Math.floor(ms/60000)
  const hrs = Math.floor(mins/60)
  if(hrs>0) return `${hrs}h ${mins%60}m`
  return `${mins}m`
}

function SessionCard({s, projCode, onPause, onEnd, onNote, tasksMap}:{s:any, projCode?:string, onPause:()=>void, onEnd:(summary:string)=>void, onNote:(note:string)=>void, tasksMap:Map<string,any>}){
  const [now, setNow]=useState(Date.now())
  const [noteDraft, setNoteDraft]=useState('')
  const isLive = !s.ended_at
  useEffect(()=>{
    if(!isLive) return
    const id=setInterval(()=> setNow(Date.now()), 1000)
    return ()=> clearInterval(id)
  },[isLive,s.started_at,s.paused_ms,s.is_paused,s.paused_at])
  // keep now used for duration recompute via durationStr
  void now
  return (
    <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs shrink-0 ${s.ended_at?'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900':'bg-emerald-600 text-white animate-pulse'}`}>#{s.id.slice(-4)}</div>
          <div>
            <div className="font-medium text-sm flex items-center gap-2">{s.goal} {isLive && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">LIVE</span>} {s.is_paused && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500 text-white">PAUSED</span>}</div>
            <div className="text-xs text-zinc-500 flex flex-wrap gap-2">
              <Link to={`/projects/${projCode}`} className="font-mono border px-1.5 py-0.5 rounded bg-zinc-50 dark:bg-zinc-800">{projCode}</Link>
              <span>{formatRelative(s.started_at)} · {durationStr(s)} {s.is_paused?'· paused':''}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isLive && <button onClick={onPause} className={`text-xs px-3 py-1.5 rounded-full border ${s.is_paused?'bg-amber-500 text-white':'bg-white dark:bg-zinc-800'}`}>{s.is_paused?'Resume':'Pause'}</button>}
          {isLive && <button onClick={()=>{ const sum=prompt('Summary?')||''; onEnd(sum)}} className="text-xs px-3 py-1.5 rounded-full bg-violet-600 text-white">End</button>}
        </div>
      </div>
      {isLive && (
        <div className="mt-3 flex gap-2">
          <input value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} placeholder="Лог заметка… что сделал сейчас" className="flex-1 px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm" onKeyDown={e=>{ if(e.key==='Enter' && noteDraft.trim()){ onNote(noteDraft.trim()); setNoteDraft('')}}} />
          <button onClick={()=>{ if(noteDraft.trim()){ onNote(noteDraft.trim()); setNoteDraft('')}}} className="px-3 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs">Add log</button>
        </div>
      )}
      {s.notes && <div className="mt-3 text-xs bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 whitespace-pre-wrap border">{s.notes}</div>}
      {s.summary && (
        <div className="mt-3 text-sm bg-zinc-50 dark:bg-zinc-800 border rounded-xl p-3">
          <div>{s.summary}</div>
          <div className="mt-2"><AgentSendButtons session={s} tasks={[...tasksMap.values()]} /></div>
        </div>
      )}
      {s.tasks_completed.length>0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {s.tasks_completed.map((id:string)=>{
            const t=tasksMap.get(id)
            return t ? <span key={id} className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border">✓ #{String(t.number).padStart(3,'0')} {t.title}</span> : <span key={id} className="text-xs px-2 py-1 rounded-full bg-zinc-50 border">#{id.slice(-4)}</span>
          })}
        </div>
      )}
    </div>
  )
}

export function SessionsPage(){
  const sessions = useStore(s=>s.sessions)
  const projects = useStore(s=>s.projects)
  const tasks = useStore(s=>s.tasks)
  const endSession = useStore(s=>s.endSession)
  const togglePause = useStore(s=>s.togglePauseSession)
  const appendNote = useStore(s=>s.appendSessionNote)
  const tasksMap = new Map(tasks.map(t=>[t.id,t]))

  const sorted = [...sessions].sort((a,b)=> new Date(b.started_at).getTime()-new Date(a.started_at).getTime())
  const active = sorted.filter(s=> !s.ended_at)
  const ended = sorted.filter(s=> !!s.ended_at)

  return (
    <div className="space-y-5 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Sessions</h1>
        <p className="text-sm text-zinc-500">Focus blocks — таймер, пауза, лог, автолинк задач, сделанных во время сессии. {sessions.length} всего · {active.length} live</p>
      </div>

      {active.length>0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-3 text-sm">
          Активных: {active.length} — не забудь поставить паузу или завершить.
        </div>
      )}

      <div className="space-y-3">
        {sorted.length===0? <div className="p-8 text-center border border-dashed rounded-2xl bg-white dark:bg-zinc-900 text-sm text-zinc-500">Нет сессий. Начни из проекта → Sessions → Start session.</div> : sorted.map(s=>{
          const proj = projects.find(p=>p.id===s.project_id)
          return <SessionCard key={s.id} s={s} projCode={proj?.code} tasksMap={tasksMap}
            onPause={()=> togglePause(s.id)}
            onEnd={(summary)=> endSession(s.id, summary)}
            onNote={(note)=> appendNote(s.id, `[${new Date().toLocaleTimeString()}] ${note}`)}
          />
        })}
      </div>

      {ended.length>0 && (
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-4">
          <h3 className="font-semibold text-sm">Статистика</h3>
          <div className="mt-2 grid grid-cols-3 gap-3 text-center">
            <div><div className="text-xl font-bold">{ended.length}</div><div className="text-xs text-zinc-500">завершено</div></div>
            <div><div className="text-xl font-bold">{ended.reduce((a,s)=> a+ (s.tasks_completed?.length??0),0)}</div><div className="text-xs text-zinc-500">задач в сессиях</div></div>
            <div><div className="text-xl font-bold">{Math.round(ended.reduce((a,s)=> a+ (new Date(s.ended_at!).getTime()- new Date(s.started_at).getTime() - (s.paused_ms??0)),0)/60000)}m</div><div className="text-xs text-zinc-500">суммарно</div></div>
          </div>
        </div>
      )}
    </div>
  )
}
