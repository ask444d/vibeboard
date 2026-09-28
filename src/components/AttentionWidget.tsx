import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useT } from '../lib/useT'

const STUCK_DAYS = 7

export function AttentionWidget() {
  const tasks = useStore(s => s.tasks)
  const ideas = useStore(s => s.ideas)
  const sessions = useStore(s => s.sessions)
  const projects = useStore(s => s.projects)
  const t = useT()

  const blocked = tasks.filter(ts => ts.status === 'BLOCKED')
  const urgent = tasks.filter(ts => ts.priority === 'URGENT' && ts.status !== 'DONE' && ts.status !== 'CANCELLED')
  const cutoff = Date.now() - STUCK_DAYS * 86400000
  const stuck = tasks.filter(ts => ts.status === 'IN_PROGRESS' && new Date(ts.updated_at).getTime() < cutoff)
  const openIdeas = ideas.filter(i => (i.status ?? 'INBOX') !== 'DROPPED' && !i.converted_to_task)
  const liveSessions = sessions.filter(s => !s.ended_at)

  const projOf = (projectId: string) => projects.find(p => p.id === projectId)
  const empty = blocked.length === 0 && urgent.length === 0 && stuck.length === 0

  const row = (id: string, projectId: string, title: string, meta: string, dot: string) => {
    const proj = projOf(projectId)
    return (
      <Link key={id} to={proj ? `/projects/${proj.code}?tab=tasks` : '/tasks'} className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="flex-1 min-w-0 truncate font-medium">{title}</span>
        <span className="text-xs text-zinc-500 shrink-0">{meta}</span>
      </Link>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-sm">🔥 {t('overview.attention')}</h3>
        <div className="flex gap-2 text-xs">
          <Link to="/ideas" className="px-2.5 py-1 rounded-full border bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700">💡 {openIdeas.length} {t('overview.openIdeas').toLowerCase()}</Link>
          <Link to="/sessions" className="px-2.5 py-1 rounded-full border bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700">◷ {liveSessions.length} {t('overview.liveSessions').toLowerCase()}</Link>
        </div>
      </div>
      {empty ? (
        <div className="mt-3 text-sm text-zinc-500 border border-dashed rounded-xl p-4 text-center">✅ {t('overview.attentionEmpty')}</div>
      ) : (
        <div className="mt-3 grid sm:grid-cols-3 gap-4">
          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase text-red-500">✕ {t('status.BLOCKED')} · {blocked.length}</div>
            <div className="mt-1 space-y-0.5 max-h-44 overflow-y-auto">
              {blocked.slice(0, 8).map(ts => row(ts.id, ts.project_id, `#${String(ts.number).padStart(3, '0')} ${ts.title}`, projOf(ts.project_id)?.code ?? '', 'bg-red-500'))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase text-amber-500">! {t('priority.URGENT')} · {urgent.length}</div>
            <div className="mt-1 space-y-0.5 max-h-44 overflow-y-auto">
              {urgent.slice(0, 8).map(ts => row(ts.id, ts.project_id, ts.title, projOf(ts.project_id)?.code ?? '', 'bg-amber-500'))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase text-zinc-500">◷ {t('overview.stuck')} · {stuck.length}</div>
            <div className="text-[11px] text-zinc-400">{t('overview.stuckHint')}</div>
            <div className="mt-1 space-y-0.5 max-h-44 overflow-y-auto">
              {stuck.slice(0, 8).map(ts => row(ts.id, ts.project_id, ts.title, projOf(ts.project_id)?.code ?? '', 'bg-zinc-400'))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
