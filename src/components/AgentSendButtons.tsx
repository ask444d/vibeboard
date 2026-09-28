import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Session, Task } from '../lib/types'
import { AGENT_META, getConfiguredHooks, sendSummary, type AgentId } from '../lib/agents'

// Кнопки отправки саммари сессии в настроенные хуки агентов.
// Без настроенных URL показывает подсказку со ссылкой в Настройки.
export function AgentSendButtons({ session, tasks }: { session: Session; tasks: Task[] }) {
  const [hooks, setHooks] = useState(getConfiguredHooks)
  const [sending, setSending] = useState<AgentId | null>(null)
  const [done, setDone] = useState<Record<string, boolean>>({})

  if (hooks.length === 0) {
    return (
      <Link
        to="/settings#integrations"
        className="text-[11px] px-2 py-1 rounded-full border bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500"
        title="Настроить хуки OpenCode / Claude Code"
      >
        → агент
      </Link>
    )
  }

  const send = async (agent: AgentId, url: string) => {
    setSending(agent)
    const ok = await sendSummary(agent, url, session, tasks, session.summary ?? '')
    setDone(d => ({ ...d, [agent]: ok }))
    setSending(null)
    // перечитать хуки — URL могли поменять в другой вкладке
    setHooks(getConfiguredHooks())
  }

  return (
    <span className="inline-flex items-center gap-1">
      {hooks.map(({ agent, url }) => (
        <button
          key={agent}
          disabled={sending === agent || !session.summary}
          onClick={() => send(agent, url)}
          title={session.summary ? `Отправить саммари в ${AGENT_META[agent].name}` : 'Сначала добавь саммари'}
          className="h-6 px-2 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-[11px] disabled:opacity-40"
        >
          {sending === agent ? '…' : done[agent] === true ? '✓' : done[agent] === false ? '!' : `${AGENT_META[agent].icon} ${AGENT_META[agent].name}`}
        </button>
      ))}
    </span>
  )
}
