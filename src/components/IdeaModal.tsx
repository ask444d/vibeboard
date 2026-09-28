import { useState } from 'react'
import { useStore } from '../store/useStore'
import { useT } from '../lib/useT'
import type { IdeaEffort, IdeaStatus, TaskPriority } from '../lib/types'

export function IdeaModal({ projectId, initialStatus, onClose }: { projectId?: string, initialStatus?: IdeaStatus, onClose: () => void }) {
  const addIdea = useStore(s => s.addIdea)
  const projects = useStore(s => s.projects)
  const t = useT()
  const [project, setProject] = useState(projectId ?? projects[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [tags, setTags] = useState('')
  const [effort, setEffort] = useState<IdeaEffort | ''>('')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [status, setStatus] = useState<IdeaStatus>(initialStatus ?? 'INBOX')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (!title.trim()) { setError(t('ideas.create.titleRequired')); return }
    if (!project) { setError(t('ideas.create.projectRequired')); return }
    addIdea(project, title.trim(), desc.trim() || undefined, {
      tags: tags.split(',').map(s => s.trim()).filter(Boolean),
      effort: effort || undefined,
      priority,
      status,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 border shadow-xl">
        <h3 className="font-semibold">{t('ideas.create.title')}</h3>
        <div className="mt-4 space-y-3">
          {!projectId && (
            <label className="block"><span className="text-xs font-medium">{t('ideas.create.project')}</span>
              <select value={project} onChange={e => setProject(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm">
                {projects.map(p => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}
              </select>
            </label>
          )}
          <label className="block"><span className="text-xs font-medium">{t('ideas.create.titleLabel')}</span><input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('ideas.placeholder')} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm" /></label>
          <label className="block"><span className="text-xs font-medium">{t('ideas.create.description')}</span><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm" /></label>
          <label className="block"><span className="text-xs font-medium">{t('ideas.create.tags')}</span><input value={tags} onChange={e => setTags(e.target.value)} placeholder="ui, ai" className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm" /></label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block"><span className="text-xs font-medium">{t('ideas.create.status')}</span>
              <select value={status} onChange={e => setStatus(e.target.value as IdeaStatus)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm">
                <option value="INBOX">Inbox</option><option value="CONSIDERED">Considered</option><option value="PLANNED">Planned</option><option value="DROPPED">Dropped</option>
              </select>
            </label>
            <label className="block"><span className="text-xs font-medium">Effort</span>
              <select value={effort} onChange={e => setEffort(e.target.value as IdeaEffort | '')} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm">
                <option value="">—</option><option value="XS">XS</option><option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option>
              </select>
            </label>
            <label className="block"><span className="text-xs font-medium">{t('tasks.create.priority')}</span>
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-zinc-50 dark:bg-zinc-800 text-sm">
                <option value="LOW">{t('priority.LOW')}</option><option value="MEDIUM">{t('priority.MEDIUM')}</option><option value="HIGH">{t('priority.HIGH')}</option><option value="URGENT">{t('priority.URGENT')}</option>
              </select>
            </label>
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm">{t('common.cancel')}</button>
          <button onClick={submit} className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium">{t('ideas.create.submit')}</button>
        </div>
      </div>
    </div>
  )
}
