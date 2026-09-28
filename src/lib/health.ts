import type { Project, Task } from './types'

export type HealthLabel = 'excellent' | 'good' | 'warning' | 'critical'
export function computeHealth(project: Project, tasks: Task[]): { score:number, labelKey:HealthLabel, color:string, details:string }{
  let done = 0, blocked = 0
  for (const t of tasks) { if (t.status==='DONE') done++; else if (t.status==='BLOCKED') blocked++ }
  const total = tasks.length
  const progress = total ? done/total*100 : 0

  const upd = new Date(project.updated_at).getTime()
  const daysStale = Number.isFinite(upd) ? (Date.now() - upd) / 86400000 : 30
  const freshness = daysStale < 0 ? 100 : daysStale < 2 ? 100 : daysStale < 7 ? 80 : daysStale < 14 ? 50 : daysStale < 30 ? 30 : 10

  const blockedRatio = total ? blocked/total : 0
  const blockedScore = Math.max(0, 100 - blockedRatio*200)

  let gitDays = 30
  if (project.last_commit) {
    const g = new Date(project.last_commit).getTime()
    gitDays = Number.isFinite(g) ? (Date.now() - g)/86400000 : 30
    if (gitDays < 0) gitDays = 0
  }
  const gitScore = gitDays < 2 ? 100 : gitDays < 7 ? 70 : gitDays < 14 ? 40 : 20

  let score = Math.round(progress*0.35 + blockedScore*0.25 + freshness*0.2 + gitScore*0.2)
  if (!Number.isFinite(score)) score = 0
  const clamped = Math.max(0, Math.min(100, score))

  let labelKey: HealthLabel = 'excellent'
  let color = 'bg-emerald-500'
  if(clamped < 40){ labelKey='critical'; color='bg-red-500' }
  else if(clamped < 60){ labelKey='warning'; color='bg-amber-500' }
  else if(clamped < 80){ labelKey='good'; color='bg-yellow-500' }

  const details = `${Math.round(progress)}% done · ${blocked} blocked · ${Math.round(daysStale)}d stale · git ${Math.round(gitDays)}d`
  return { score: clamped, labelKey, color, details }
}
// Совместимость: старый код ждет `label` на русском
export function healthLabelRu(labelKey: HealthLabel): string {
  return labelKey==='excellent' ? 'Отлично' : labelKey==='good' ? 'Норм' : labelKey==='warning' ? 'Внимание' : 'Критично'
}
