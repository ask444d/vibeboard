import { useStore } from '../store/useStore'
import type { IdeaStatus } from '../lib/types'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IdeaBoard } from '../components/IdeaBoard'
import { IdeaModal } from '../components/IdeaModal'
import { useT } from '../lib/useT'

const STATUS_FILTERS = ['ALL', 'INBOX', 'CONSIDERED', 'PLANNED', 'DROPPED'] as const

export function IdeasPage() {
  const ideas = useStore(s => s.ideas)
  const projects = useStore(s => s.projects)
  const updateIdea = useStore(s => s.updateIdea)
  const convertIdeaToTask = useStore(s => s.convertIdeaToTask)
  const t = useT()
  const [view, setView] = useState<'board' | 'list'>(() => (localStorage.getItem('vb-ideas-view') as any) || 'board')
  const [filter, setFilter] = useState<IdeaStatus | 'ALL'>('ALL')
  const [projectFilter, setProjectFilter] = useState<string>('ALL')
  const [tagFilter, setTagFilter] = useState<string>('ALL')
  const [q, setQ] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createStatus, setCreateStatus] = useState<IdeaStatus>('INBOX')

  const setViewPersist = (v: 'board' | 'list') => { localStorage.setItem('vb-ideas-view', v); setView(v) }

  const allTags = Array.from(new Set(ideas.flatMap(i => i.tags ?? []))).sort()

  const filtered = ideas.filter(i => {
    if (filter !== 'ALL' && (i.status ?? 'INBOX') !== filter) return false
    if (projectFilter !== 'ALL' && i.project_id !== projectFilter) return false
    if (tagFilter !== 'ALL' && !(i.tags ?? []).includes(tagFilter)) return false
    if (q && !(i.title.toLowerCase().includes(q.toLowerCase()) || i.description?.toLowerCase().includes(q.toLowerCase()))) return false
    return true
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const grouped = {
    INBOX: filtered.filter(i => (i.status ?? 'INBOX') === 'INBOX').length,
    CONSIDERED: filtered.filter(i => (i.status ?? 'INBOX') === 'CONSIDERED').length,
    PLANNED: filtered.filter(i => (i.status ?? 'INBOX') === 'PLANNED').length,
    DROPPED: filtered.filter(i => (i.status ?? 'INBOX') === 'DROPPED').length,
  }

  const handleAddFromBoard = (status: IdeaStatus) => {
    setCreateStatus(status)
    setShowCreate(true)
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('ideas.title')}</h1>
          <p className="text-sm text-zinc-500">{t('ideas.subtitle')} · {ideas.length} {t('ideas.ideasCount')} · {filtered.length} {t('tasks.shown')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border overflow-hidden bg-white dark:bg-zinc-900 p-1">
            <button onClick={() => setViewPersist('board')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view === 'board' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-600'}`}>{t('tasks.board')}</button>
            <button onClick={() => setViewPersist('list')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view === 'list' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'text-zinc-600'}`}>{t('tasks.list')}</button>
          </div>
          <button onClick={() => { setCreateStatus('INBOX'); setShowCreate(true) }} disabled={projects.length === 0} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50">+ {t('ideas.new')}</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="px-3 py-1.5 rounded-full border bg-white dark:bg-zinc-900 text-sm">
          <option value="ALL">{t('ideas.allProjects')}</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}
        </select>
        <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="px-3 py-1.5 rounded-full border bg-white dark:bg-zinc-900 text-sm">
          <option value="ALL">#tags</option>
          {allTags.map(tag => <option key={tag} value={tag}>#{tag}</option>)}
        </select>
        {view === 'list' && STATUS_FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filter === f ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-900'}`}>{f === 'ALL' ? t('projects.filterAll') : f.charAt(0) + f.slice(1).toLowerCase()} {f !== 'ALL' ? `· ${grouped[f as keyof typeof grouped]}` : ''}</button>
        ))}
        {view === 'board' && (
          <span className="text-xs text-zinc-500 hidden sm:inline">{t('ideas.boardDesc')}</span>
        )}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('ideas.searchPlaceholder')} className="ml-auto px-3 py-1.5 rounded-full border bg-white dark:bg-zinc-900 text-sm w-full sm:w-64" />
      </div>

      {view === 'board' ? (
        <IdeaBoard ideas={filtered} showProject onAdd={handleAddFromBoard} />
      ) : (
        <div className="bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden">
          <div className="divide-y">
            {filtered.length === 0 ? <div className="p-8 text-center text-sm text-zinc-500">{t('ideas.noIdeas')}</div> : filtered.map(i => {
              const proj = projects.find(p => p.id === i.project_id)
              return (
                <div key={i.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <span className="text-sm">💡</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{i.title}</div>
                    <div className="text-xs text-zinc-500 flex gap-2"><Link to={`/projects/${proj?.code}`} className="hover:underline font-mono">{proj?.code}</Link><span>{proj?.name}</span><span>▲ {i.votes ?? 0}</span></div>
                  </div>
                  {i.effort && <span className="hidden sm:inline text-xs px-2 py-1 rounded-full border bg-zinc-50 dark:bg-zinc-800">{i.effort}</span>}
                  <select value={i.status ?? 'INBOX'} onChange={e => updateIdea(i.id, { status: e.target.value as IdeaStatus })} className="text-xs px-2 py-1 rounded-full border bg-white dark:bg-zinc-900">
                    <option value="INBOX">📥 Inbox</option><option value="CONSIDERED">👀 Considered</option><option value="PLANNED">📌 Planned</option><option value="DROPPED">🗑️ Dropped</option>
                  </select>
                  {!i.converted_to_task && <button onClick={() => convertIdeaToTask(i.id)} className="text-xs px-2 py-1 rounded-full bg-violet-600 text-white">→ Task</button>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showCreate && <IdeaModal initialStatus={createStatus} onClose={() => setShowCreate(false)} />}
    </div>
  )
}
