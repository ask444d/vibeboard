import type { Session, Task } from './types'
import { safeGet, safeSet } from './storage'

// Интеграция с AI-агентами (OpenCode / Claude Code) через локальные хуки.
// Никакой магии: саммари собирается из данных сессии детерминированным шаблоном,
// затем POSTится на настроенные URL. Без URL — просто возвращается текст.

export type AgentId = 'opencode' | 'claude'

export interface AgentHook {
  agent: AgentId
  url: string
}

export interface AgentPayload {
  sessionId: string
  goal: string
  summary: string
  tasksCompleted: string[]
}

export interface AgentSendResult {
  agent: AgentId
  url: string
  ok: boolean
}

const HOOK_KEYS: Record<AgentId, string> = {
  opencode: 'vb-opencode-url',
  claude: 'vb-claude-url',
}

export const AGENT_META: Record<AgentId, { name: string; icon: string; placeholder: string }> = {
  opencode: { name: 'OpenCode', icon: '◉', placeholder: 'http://localhost:4096' },
  claude: { name: 'Claude Code', icon: '✦', placeholder: 'http://localhost:4100/hook' },
}

export function getAgentHook(agent: AgentId): string | null {
  const url = (safeGet(HOOK_KEYS[agent]) ?? '').trim()
  return url ? url : null
}

export function setAgentHook(agent: AgentId, url: string): void {
  safeSet(HOOK_KEYS[agent], url.trim())
}

export function getConfiguredHooks(): AgentHook[] {
  const out: AgentHook[] = []
  for (const agent of ['opencode', 'claude'] as AgentId[]) {
    const url = getAgentHook(agent)
    if (url) out.push({ agent, url })
  }
  return out
}

function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch { return false }
}

// Детерминированное саммари из данных сессии: цель, длительность,
// только задачи, закрытые в этой сессии, следующий шаг. Без выдумок.
export function buildSessionSummary(session: Session, tasks: Task[]): string {
  const valid = new Set(session.tasks_completed)
  const inSession = tasks
    .filter(t => valid.has(t.id))
    .slice(0, 3)
    .map(t => `#${String(t.number).padStart(3, '0')} ${t.title}`)
    .join(', ')
  const start = new Date(session.started_at).getTime()
  const end = new Date(session.ended_at ?? new Date().toISOString()).getTime()
  const mins = Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.round((end - start) / 60000)) : 0
  const inProg = tasks.find(t => t.status === 'IN_PROGRESS')?.title
  const todo = tasks.find(t => t.status === 'TODO')?.title
  return [
    `Сессия "${session.goal}" — ${mins} мин.`,
    inSession ? `Закрыто: ${inSession}.` : 'Задач не закрыто — фокус на исследовании.',
    `Следующий шаг: ${inProg ?? todo ?? 'выбери Next Action'}.`,
  ].join(' ')
}

export async function postToAgentHook(url: string, payload: AgentPayload): Promise<boolean> {
  if (!isHttpUrl(url)) return false
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch { return false }
}

export async function sendSummaryToAgents(
  session: Session,
  tasks: Task[],
): Promise<{ summary: string; results: AgentSendResult[] }> {
  const summary = buildSessionSummary(session, tasks)
  const hooks = getConfiguredHooks()
  const payload: AgentPayload = {
    sessionId: session.id,
    goal: session.goal,
    summary,
    tasksCompleted: [...session.tasks_completed],
  }
  const results = await Promise.all(
    hooks.map(async ({ agent, url }) => ({ agent, url, ok: await sendSummary(agent, url, session, tasks, summary) })),
  )
  return { summary, results }
}

// URL без пути (http://localhost:4096) — адрес самого opencode serve.
// Тогда говорим с ним нативно: POST /session + POST /session/:id/message.
export function isOpenCodeServerUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    return u.pathname === '/' || u.pathname === ''
  } catch { return false }
}

interface OpenCodeSessionResponse { id: string }

async function postJson(url: string, body: unknown, timeoutMs = 8000): Promise<{ ok: boolean; json: any }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    let json: any = null
    try { json = await res.json() } catch { /* пустой ответ — ок */ }
    return { ok: res.ok, json }
  } catch { return { ok: false, json: null } }
}

// Нативная отправка в OpenCode: создаём сессию с целью VibeBoard-сессии
// и кладём саммари первым сообщением. Возвращает id сессии OpenCode.
export async function sendToOpenCodeServer(
  baseUrl: string,
  session: Session,
  summary: string,
): Promise<{ ok: boolean; openCodeSessionId?: string }> {
  const base = baseUrl.replace(/\/+$/, '')
  const created = await postJson(`${base}/session`, { title: `VibeBoard: ${session.goal}` })
  const data = created.json as OpenCodeSessionResponse | null
  if (!created.ok || !data || typeof data.id !== 'string') return { ok: false }
  const text = [
    `Саммари сессии из VibeBoard (цель: ${session.goal}):`,
    '',
    summary,
    '',
    `VibeBoard session: ${session.id}`,
  ].join('\n')
  const sent = await postJson(`${base}/session/${data.id}/message`, {
    parts: [{ type: 'text', text }],
  }, 15000)
  return { ok: sent.ok, openCodeSessionId: sent.ok ? data.id : undefined }
}

// Единая точка отправки: OpenCode + адрес сервера → нативный API,
// всё остальное → сырой POST нашего JSON на указанный URL (свой relay/плагин).
export async function sendSummary(
  agent: AgentId,
  url: string,
  session: Session,
  tasks: Task[],
  summary?: string,
): Promise<boolean> {
  const text = summary ?? buildSessionSummary(session, tasks)
  if (agent === 'opencode' && isOpenCodeServerUrl(url)) {
    return (await sendToOpenCodeServer(url, session, text)).ok
  }
  return postToAgentHook(url, {
    sessionId: session.id,
    goal: session.goal,
    summary: text,
    tasksCompleted: [...session.tasks_completed],
  })
}
