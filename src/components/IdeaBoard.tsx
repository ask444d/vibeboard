import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Idea, IdeaStatus, IdeaEffort } from '../lib/types'
import { useStore } from '../store/useStore'
import { useT } from '../lib/useT'

const COLUMNS: { key: IdeaStatus, icon: string, tint: string }[] = [
  { key: 'INBOX', icon: '📥', tint: 'bg-zinc-100 dark:bg-zinc-800' },
  { key: 'CONSIDERED', icon: '👀', tint: 'bg-blue-50 dark:bg-blue-950/30' },
  { key: 'PLANNED', icon: '📌', tint: 'bg-violet-50 dark:bg-violet-950/30' },
  { key: 'DROPPED', icon: '🗑️', tint: 'bg-zinc-200/60 dark:bg-zinc-800/60' },
]

const COLUMN_LABEL: Record<IdeaStatus, string> = {
  INBOX: 'Inbox',
  CONSIDERED: 'Considered',
  PLANNED: 'Planned',
  DROPPED: 'Dropped',
}

const EFFORT_DOT: Record<IdeaEffort, string> = {
  XS: 'bg-zinc-400',
  S: 'bg-emerald-500',
  M: 'bg-amber-500',
  L: 'bg-orange-500',
  XL: 'bg-red-500',
}
const EFFORT_COLOR: Record<IdeaEffort, string> = {
  XS: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  S: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  M: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  L: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  XL: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export function IdeaBoard({
  ideas,
  showProject = false,
  onAdd,
  highlightId,
}: {
  ideas: Idea[]
  showProject?: boolean
  onAdd?: (status: IdeaStatus) => void
  highlightId?: string
}) {
  const updateIdea = useStore(s => s.updateIdea)
  const voteIdea = useStore(s => s.voteIdea)
  const convertIdeaToTask = useStore(s => s.convertIdeaToTask)
  const deleteIdea = useStore(s => s.deleteIdea)
  const projects = useStore(s => s.projects)
  const t = useT()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<IdeaStatus | null>(null)

  const handleDrop = (status: IdeaStatus) => {
    if (dragId) {
      updateIdea(dragId, { status })
    }
    setDragId(null)
    setDragOver(null)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none" style={{ scrollbarWidth: 'thin' }}>
      {COLUMNS.map(col => {
        const colIdeas = ideas.filter(i => (i.status ?? 'INBOX') === col.key)
        const isOver = dragOver === col.key
        return (
          <div
            key={col.key}
            onDragOver={e => { e.preventDefault(); setDragOver(col.key) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(col.key)}
            className={`shrink-0 snap-start w-[84vw] max-w-[320px] sm:w-[300px] sm:max-w-none rounded-2xl border flex flex-col max-h-[70vh] sm:max-h-[72vh] ${isOver ? 'ring-2 ring-violet-500 ring-offset-1 dark:ring-offset-zinc-900' : ''} ${col.tint}`}
          >
            <div className="sticky top-0 p-3 flex items-center gap-2 border-b bg-white/60 dark:bg-zinc-900/40 backdrop-blur rounded-t-2xl">
              <span className="text-sm">{col.icon}</span>
              <span className="text-xs font-semibold tracking-widest uppercase">{COLUMN_LABEL[col.key]}</span>
              <span className="ml-auto text-xs bg-white dark:bg-zinc-800 border px-1.5 py-0.5 rounded-full">{colIdeas.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
              {colIdeas.length === 0 ? (
                <div className={`h-24 border-2 border-dashed rounded-xl flex items-center justify-center text-xs transition-colors ${isOver ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/20 text-violet-600' : 'border-zinc-300 dark:border-zinc-600 bg-white/50 dark:bg-zinc-800/30 text-zinc-400'}`}>
                  {isOver ? 'Drop here' : '—'}
                </div>
              ) : (
                <>
                  {colIdeas.map(idea => {
                    const proj = showProject ? projects.find(p => p.id === idea.project_id) : null
                    return (
                      <div
                        key={idea.id}
                        id={`focus-${idea.id}`}
                        draggable
                        onDragStart={() => setDragId(idea.id)}
                        onDragEnd={() => { setDragId(null); setDragOver(null) }}
                        className={`group bg-white dark:bg-zinc-900 border rounded-xl p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow scroll-mt-24 ${dragId === idea.id ? 'opacity-50 rotate-1' : ''} ${highlightId === idea.id ? 'ring-2 ring-violet-500 shadow-lg' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] text-zinc-500">💡 {new Date(idea.created_at).toLocaleDateString()}</span>
                          {idea.effort && (
                            <span className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${EFFORT_DOT[idea.effort]}`} title={idea.effort} />
                              <span className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded font-medium border ${EFFORT_COLOR[idea.effort]}`}>{idea.effort}</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm font-medium leading-snug line-clamp-2">{idea.title}</div>
                        {idea.description && <div className="mt-1 text-xs text-zinc-500 line-clamp-2">{idea.description}</div>}
                        {idea.tags && idea.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {idea.tags.map(tag => <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border">#{tag}</span>)}
                          </div>
                        )}
                        {showProject && proj && (
                          <Link to={`/projects/${proj.code}`} className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-50 dark:bg-zinc-800 border hover:bg-zinc-100">
                            {proj.code} <span className="truncate max-w-[80px]">{proj.name}</span>
                          </Link>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1 text-xs text-zinc-500">
                              <button onClick={() => voteIdea(idea.id, -1)} className="w-5 h-5 rounded-full border hover:bg-zinc-100 dark:hover:bg-zinc-800">−</button>
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">{idea.votes ?? 0}</span>
                              <button onClick={() => voteIdea(idea.id, 1)} className="w-5 h-5 rounded-full border hover:bg-zinc-100 dark:hover:bg-zinc-800">＋</button>
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!idea.converted_to_task && (
                              <button onClick={() => convertIdeaToTask(idea.id)} className="h-6 px-2 rounded-full bg-violet-600 text-white text-[11px]">→ Task</button>
                            )}
                            <button onClick={() => deleteIdea(idea.id)} className="w-6 h-6 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500 text-xs">✕</button>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-1">
                          {COLUMNS.filter(c => c.key !== (idea.status ?? 'INBOX')).slice(0, 3).map(c => (
                            <button key={c.key} onClick={() => updateIdea(idea.id, { status: c.key })} className="text-[11px] px-1.5 py-0.5 rounded-full border bg-zinc-50 dark:bg-zinc-800 hover:bg-white text-zinc-600 dark:text-zinc-400">
                              → {COLUMN_LABEL[c.key]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  <div className={`h-12 border-2 border-dashed rounded-xl flex items-center justify-center text-xs transition-colors ${isOver ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/20 text-violet-600' : 'border-zinc-300/70 dark:border-zinc-600/50 bg-white/30 dark:bg-zinc-800/20 text-zinc-400'}`}>
                    {isOver ? 'Drop here' : '+'}
                  </div>
                </>
              )}
            </div>

            <div className="p-2 border-t bg-white/40 dark:bg-zinc-900/20 rounded-b-2xl">
              <button onClick={() => onAdd?.(col.key)} className="w-full py-1.5 rounded-xl border border-dashed bg-white dark:bg-zinc-900 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">
                + {t('common.add')}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
