import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildSessionSummary, isOpenCodeServerUrl, postToAgentHook, sendSummary, sendSummaryToAgents, sendToOpenCodeServer } from '../agents'
import type { Session, Task } from '../types'

function mkSession(over: Partial<Session> = {}): Session {
  return {
    id: 's1', project_id: 'p1', goal: 'Ship feature', summary: 'Did stuff',
    started_at: new Date(Date.now() - 3600000).toISOString(),
    ended_at: new Date().toISOString(),
    tasks_completed: ['t1'], notes: '', ...over,
  } as Session
}

function mkTask(over: Partial<Task> = {}): Task {
  return {
    id: 't1', project_id: 'p1', number: 1, title: 'Build UI', status: 'DONE',
    priority: 'MEDIUM', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...over,
  } as Task
}

describe('buildSessionSummary', () => {
  it('uses only tasks completed in this session', () => {
    const s = mkSession({ tasks_completed: ['t1'] })
    const tasks = [mkTask({ id: 't1', title: 'Build UI' }), mkTask({ id: 't2', title: 'Other', status: 'DONE' })]
    const text = buildSessionSummary(s, tasks)
    expect(text).toContain('Build UI')
    expect(text).not.toContain('Other')
  })
  it('handles invalid dates without NaN', () => {
    const s = mkSession({ started_at: 'foo', ended_at: 'bar' })
    expect(buildSessionSummary(s, [])).not.toContain('NaN')
  })
  it('mentions next step', () => {
    const s = mkSession({ tasks_completed: [] })
    const tasks = [mkTask({ id: 't9', title: 'Next thing', status: 'TODO' })]
    expect(buildSessionSummary(s, tasks)).toContain('Next thing')
  })
})

describe('postToAgentHook', () => {
  const realFetch = globalThis.fetch

  afterEach(() => { globalThis.fetch = realFetch })

  it('rejects non-http urls without fetching', async () => {
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as any
    expect(await postToAgentHook('ftp://evil/x', { sessionId: 's', goal: 'g', summary: 'x', tasksCompleted: [] })).toBe(false)
    expect(await postToAgentHook('javascript:alert(1)', { sessionId: 's', goal: 'g', summary: 'x', tasksCompleted: [] })).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns ok flag from response', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true })) as any
    expect(await postToAgentHook('http://localhost:4096/hook', { sessionId: 's', goal: 'g', summary: 'x', tasksCompleted: [] })).toBe(true)
  })

  it('returns false on network error', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('down') }) as any
    expect(await postToAgentHook('http://localhost:4096/hook', { sessionId: 's', goal: 'g', summary: 'x', tasksCompleted: [] })).toBe(false)
  })
})

describe('isOpenCodeServerUrl', () => {
  it('detects server base urls', () => {
    expect(isOpenCodeServerUrl('http://localhost:4096')).toBe(true)
    expect(isOpenCodeServerUrl('http://localhost:4096/')).toBe(true)
    expect(isOpenCodeServerUrl('http://localhost:4096/hook')).toBe(false)
    expect(isOpenCodeServerUrl('http://localhost:4096/session/x/message')).toBe(false)
    expect(isOpenCodeServerUrl('not a url')).toBe(false)
  })
})

describe('sendToOpenCodeServer', () => {
  const realFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = realFetch })

  it('creates session then posts message', async () => {
    const calls: Array<{ url: string; body: any }> = []
    globalThis.fetch = vi.fn(async (url: any, init: any) => {
      calls.push({ url: String(url), body: JSON.parse(init.body) })
      if (String(url).endsWith('/session')) return { ok: true, json: async () => ({ id: 'abc123' }) }
      return { ok: true, json: async () => ({}) }
    }) as any
    const res = await sendToOpenCodeServer('http://localhost:4096/', mkSession(), 'hello summary')
    expect(res).toEqual({ ok: true, openCodeSessionId: 'abc123' })
    expect(calls[0].url).toBe('http://localhost:4096/session')
    expect(calls[0].body.title).toContain('Ship feature')
    expect(calls[1].url).toBe('http://localhost:4096/session/abc123/message')
    expect(calls[1].body.parts[0]).toEqual({ type: 'text', text: expect.stringContaining('hello summary') })
  })

  it('fails gracefully when session creation fails', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, json: async () => null })) as any
    expect(await sendToOpenCodeServer('http://localhost:4096', mkSession(), 'x')).toEqual({ ok: false })
  })
})

describe('sendSummary', () => {
  const realFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = realFetch })

  it('uses native API for opencode server base', async () => {
    globalThis.fetch = vi.fn(async (url: any) => {
      if (String(url).endsWith('/session')) return { ok: true, json: async () => ({ id: 's1' }) }
      return { ok: true, json: async () => ({}) }
    }) as any
    expect(await sendSummary('opencode', 'http://localhost:4096', mkSession(), [mkTask()])).toBe(true)
  })

  it('uses raw POST for custom urls', async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({}) }))
    globalThis.fetch = fetchSpy as any
    expect(await sendSummary('claude', 'http://127.0.0.1:4100/hook', mkSession(), [mkTask()], 'txt')).toBe(true)
    const firstCall = fetchSpy.mock.calls[0] as unknown as [unknown, { body: string }]
    const body = JSON.parse(firstCall[1].body)
    expect(body).toMatchObject({ sessionId: 's1', goal: 'Ship feature', summary: 'txt' })
  })
})

describe('sendSummaryToAgents', () => {
  beforeEach(() => { localStorage.clear() })

  it('returns summary with no results when no hooks configured', async () => {
    const { summary, results } = await sendSummaryToAgents(mkSession(), [mkTask()])
    expect(summary).toContain('Ship feature')
    expect(results).toEqual([])
  })
})
