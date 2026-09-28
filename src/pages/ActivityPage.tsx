import { useStore } from '../store/useStore'
import { Link } from 'react-router-dom'

export function ActivityPage(){
  const activities = useStore(s=>s.activities)
  const projects = useStore(s=>s.projects)
  // group by date
  const groups = new Map<string, typeof activities>()
  for(const a of activities){
    const d = new Date(a.created_at).toLocaleDateString('en-US',{day:'numeric', month:'long', year:'numeric'})
    if(!groups.has(d)) groups.set(d, [])
    groups.get(d)!.push(a)
  }
  return (
    <div className="space-y-5 animate-in max-w-3xl">
      <div><h1 className="text-2xl font-bold">Activity</h1><p className="text-sm text-zinc-500">Timeline of everything — tasks, ideas, status changes. Future: git commits.</p></div>
      <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6">
        {activities.length===0? <div className="text-sm text-zinc-500">No activity</div> : Array.from(groups.entries()).map(([date, items])=>(
          <div key={date} className="mb-6 last:mb-0">
            <div className="text-xs font-semibold tracking-widest text-zinc-500 uppercase sticky top-16 bg-white dark:bg-zinc-900 py-2">{date}</div>
            <div className="mt-2 space-y-3 relative">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" />
              {items.map(a=>{
                const proj = projects.find(p=>p.id===a.project_id)
                const t = new Date(a.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
                const icon = a.type==='created_task'?'＋': a.type==='completed_task'?'✓': a.type==='added_idea'?'💡': a.type==='status_change'?'◐': '•'
                return (
                  <div key={a.id} className="relative pl-8">
                    <span className="absolute left-0 top-1 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 border flex items-center justify-center text-[10px]">{icon}</span>
                    <div className="text-xs text-zinc-500">{t} {proj && <Link to={`/projects/${proj.code}`} className="font-mono hover:underline">{proj.code}</Link>}</div>
                    <div className="text-sm">{a.description}</div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
