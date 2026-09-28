#!/usr/bin/env node
// VibeBoard → agent relay. Zero dependencies, stdlib only.
// Принимает POST от VibeBoard (JSON {sessionId, goal, summary, tasksCompleted})
// и дописывает саммари в inbox-файл, который читает твой агент.
// Опционально (--forward) сразу толкает текст в OpenCode через его server API.
//
//   node scripts/vibeboard-agent-relay.mjs --port 4100 --inbox ~/VIBEBOARD_INBOX.md
//   node scripts/vibeboard-agent-relay.mjs --port 4100 --forward http://localhost:4096
//
// Claude Code: добавь хук SessionStart в .claude/settings.json,
// чтобы агент подбирал inbox при старте сессии (пример ниже в --help выводе).
// Слушает ТОЛЬКО 127.0.0.1 — наружу ничего не торчит.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const args = process.argv.slice(2)
const get = (flag, fallback) => {
  const i = args.indexOf(flag)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
VibeBoard agent relay — приём саммари сессий для AI-агентов.

Использование:
  node scripts/vibeboard-agent-relay.mjs [--port 4100] [--inbox ~/VIBEBOARD_INBOX.md] [--forward http://localhost:4096]

Что делает:
  POST /hook  {sessionId, goal, summary, tasksCompleted}
    → дописывает блок в inbox-файл
    → если задан --forward, создаёт сессию в OpenCode (POST /session)
       и кладёт саммари первым сообщением (POST /session/:id/message)

Claude Code — хук SessionStart (.claude/settings.json в проекте):
  {
    "hooks": {
      "SessionStart": [
        { "hooks": [{ "type": "command", "command": "cat ~/VIBEBOARD_INBOX.md 2>/dev/null || true" }] }
      ]
    }
  }
После этого каждая новая сессия Claude увидит свежие саммари из VibeBoard.

Проверка:
  curl -X POST http://127.0.0.1:4100/hook \\
    -H 'Content-Type: application/json' \\
    -d '{"sessionId":"s1","goal":"demo","summary":"test","tasksCompleted":[]}'
`)
  process.exit(0)
}

const PORT = Number(get('--port', '4100')) || 4100
const INBOX = get('--inbox', '~/VIBEBOARD_INBOX.md').replace(/^~(?=$|\/)/, os.homedir())
const FORWARD = get('--forward', null)

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', c => {
      size += c.length
      if (size > 256 * 1024) { reject(new Error('body too large')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function appendInbox(p) {
  const block = [
    '',
    `## ${p.goal || 'VibeBoard session'} (${p.sessionId || 'n/a'})`,
    '',
    String(p.summary || '(пустое саммари)'),
    '',
    Array.isArray(p.tasksCompleted) && p.tasksCompleted.length
      ? `Задачи: ${p.tasksCompleted.join(', ')}`
      : '',
    `Получено: ${new Date().toISOString()}`,
    '',
  ].join('\n')
  fs.mkdirSync(path.dirname(INBOX), { recursive: true })
  fs.appendFileSync(INBOX, block, 'utf8')
}

async function forwardToOpenCode(p) {
  const base = FORWARD.replace(/\/+$/, '')
  const mk = (url, body, timeoutMs = 8000) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    }).then(async r => ({ ok: r.ok, json: await r.json().catch(() => null) }))
  const created = await mk(`${base}/session`, { title: `VibeBoard: ${p.goal || 'session'}` })
  if (!created.ok || !created.json || typeof created.json.id !== 'string') {
    throw new Error('opencode: не смог создать сессию')
  }
  const text = [`Саммари сессии из VibeBoard (цель: ${p.goal || 'n/a'}):`, '', String(p.summary || ''), '', `VibeBoard session: ${p.sessionId || 'n/a'}`].join('\n')
  const sent = await mk(`${base}/session/${created.json.id}/message`, { parts: [{ type: 'text', text }] }, 15000)
  if (!sent.ok) throw new Error('opencode: не смог отправить сообщение')
  return created.json.id
}

const server = http.createServer(async (req, res) => {
  const setCors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }
  if (req.method === 'OPTIONS') { setCors(); res.writeHead(204); res.end(); return }
  if (req.method === 'GET' && req.url === '/health') {
    setCors(); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"healthy":true}'); return
  }
  if (req.method !== 'POST' || (req.url !== '/hook' && req.url !== '/')) {
    setCors(); res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{"ok":false,"error":"use POST /hook"}'); return
  }
  try {
    const raw = await readBody(req)
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') throw new Error('bad json')
    appendInbox(p)
    let forwarded = null
    if (FORWARD) forwarded = await forwardToOpenCode(p)
    setCors()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, forwarded }))
  } catch (e) {
    setCors()
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: String((e && e.message) || e) }))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`VibeBoard relay слушает http://127.0.0.1:${PORT}/hook`)
  console.log(`Inbox: ${INBOX}` + (FORWARD ? `\nForward → ${FORWARD}` : ''))
  console.log('Вставь этот URL в VibeBoard → Настройки → Интеграции → Claude Code hook')
})
