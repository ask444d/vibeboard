import { useStore } from '../store/useStore'

function last7Days(){
  const days=[]
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i)
    days.push(d)
  }
  return days
}

export function WeeklyChart(){
  const tasks = useStore(s=>s.tasks)
  const sessions = useStore(s=>s.sessions)
  const activities = useStore(s=>s.activities)
  const days = last7Days()
  const dayKey = (d:Date)=> d.toISOString().slice(0,10)

  const tasksDone = days.map(d=>{
    const k=dayKey(d)
    return tasks.filter(t=> t.completed_at && t.completed_at.slice(0,10)===k).length
  })
  const sessCount = days.map(d=>{
    const k=dayKey(d)
    return sessions.filter(s=> s.started_at.slice(0,10)===k).length
  })
  const acts = days.map(d=>{
    const k=dayKey(d)
    return activities.filter(a=> a.created_at.slice(0,10)===k).length
  })

  const max = Math.max(1, ...tasksDone, ...sessCount, ...acts)

  return (
    <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
      <h3 className="font-semibold">Недельная продуктивность — пункт 6</h3>
      <p className="text-xs text-zinc-500">Задачи DONE, сессии, активность. Подсчёт локально, без отправки.</p>
      <div className="mt-4 flex items-end gap-2 h-28">
        {days.map((d,i)=>(
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex flex-col gap-1 items-center justify-end h-24">
              <div className="w-full rounded-t bg-violet-600" style={{height: `${(tasksDone[i]/max)*60}px`}} title={`Done ${tasksDone[i]}`}/>
              <div className="w-full rounded bg-emerald-500" style={{height: `${(sessCount[i]/max)*40}px`}} title={`Sessions ${sessCount[i]}`}/>
              <div className="w-full rounded bg-amber-400" style={{height: `${(acts[i]/max)*20}px`}} title={`Activity ${acts[i]}`}/>
            </div>
            <span className="text-[11px] text-zinc-500">{d.toLocaleDateString(undefined,{weekday:'short'})}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-violet-600"/> DONE</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500"/> Sessions</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400"/> Activity</span>
      </div>
      {tasksDone.reduce((a,b)=>a+b,0)===0 && sessCount.reduce((a,b)=>a+b,0)===0 && <div className="text-xs text-zinc-500 mt-2">Нет данных за неделю — начни сессию или закрой задачу.</div>}
    </div>
  )
}

export function HealthNotifications(){
  const projects = useStore(s=>s.projects)
  const tasks = useStore(s=>s.tasks)
  // compute health alerts
  const alerts = projects.map(p=>{
    const blocked = tasks.filter(t=> t.project_id===p.id && t.status==='BLOCKED').length
    const total = tasks.filter(t=> t.project_id===p.id).length
    const stale = (Date.now()- new Date(p.updated_at).getTime())/86400000
    if(blocked>0 && total>0 && blocked/total>0.3) return { p, msg:`Много блокеров: ${blocked}/${total}` }
    if(stale>14) return { p, msg:`Заброшен: ${Math.round(stale)} дн. без апдейта` }
    return null
  }).filter(Boolean) as any[]

  if(alerts.length===0) return null
  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-2xl p-4">
      <div className="text-sm font-medium">⚠️ Требует внимания — {alerts.length}</div>
      <div className="mt-2 space-y-1">
        {alerts.map((a:any)=>(
          <div key={a.p.id} className="text-xs flex justify-between"><span className="font-mono">{a.p.code} {a.p.name}</span><span className="text-zinc-600 dark:text-zinc-400">{a.msg}</span></div>
        ))}
      </div>
    </div>
  )
}
