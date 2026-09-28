import { PROJECT_STATUS_META, TASK_STATUS_META, PRIORITY_META } from '../../lib/constants'
import type { ProjectStatus, TaskStatus, TaskPriority } from '../../lib/types'

export function StatusBadge({ status }: {status: ProjectStatus}){
  const m = PROJECT_STATUS_META[status]
  return <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-zinc-50 dark:bg-zinc-800 border"><span className={`w-2 h-2 rounded-full ${m.dot}`} />{m.label}</span>
}
export function TaskStatusBadge({ status }: {status:TaskStatus}){
  const m = TASK_STATUS_META[status]
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${m.cls}`}><span>{m.icon}</span>{m.label}</span>
}
export function PriorityBadge({ priority }: {priority: TaskPriority}){
  const m = PRIORITY_META[priority]
  return <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${m.color}`}>{m.label}</span>
}
export function TypeBadge({ type }: {type:string}){
  const colors: Record<string,string> = {
    WEB:'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    APP:'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    GAME:'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    BOT:'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
    AI:'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300',
    TOOL:'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    OTHER:'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  }
  return <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-medium ${colors[type]?? colors.OTHER}`}>{type}</span>
}
