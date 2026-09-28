import { useStore } from '../store/useStore'
import { scanDirectoryHandle, readFolderHandle } from '../lib/utils'
import { isTauri } from '../lib/tauri'
import { tauriPickFolder, scanNativeFolder, scanNativeProject } from '../lib/tauriFs'
import { registerNativeRoot } from '../lib/watch'
import { useState } from 'react'
import { useT } from '../lib/useT'
import { locales, getCoverage, getTotalKeys, getTranslatedCount } from '../lib/i18n'
import { AGENT_META, getAgentHook, setAgentHook, type AgentId } from '../lib/agents'

function AgentHookField({ agent }: { agent: AgentId }) {
  const meta = AGENT_META[agent]
  const [url, setUrl] = useState(() => getAgentHook(agent) ?? '')
  const [saved, setSaved] = useState(false)
  return (
    <div className="border rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800">
      <div className="text-xs font-medium flex items-center gap-1.5">
        <span>{meta.icon}</span> {meta.name} hook <span className="text-zinc-400">(local only)</span>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={url}
          onChange={e => { setUrl(e.target.value); setSaved(false) }}
          placeholder={meta.placeholder}
          className="flex-1 px-2 py-1.5 rounded-lg border bg-white dark:bg-zinc-900 text-xs font-mono"
        />
        <button
          onClick={() => { setAgentHook(agent, url); setSaved(true) }}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs"
        >
          {saved ? '✓' : 'Save'}
        </button>
      </div>
      <div className="mt-1 text-[11px] text-zinc-500">
        {agent === 'opencode'
          ? 'Адрес сервера — саммари создаст новую сессию OpenCode нативно. Или свой URL — туда POST {sessionId, goal, summary, tasksCompleted}.'
          : 'Claude Code не принимает HTTP — нужен локальный relay (инструкция ниже). Сюда — его URL.'}
      </div>
    </div>
  )
}

export function SettingsPage(){
  const folder = useStore(s=>s.folder)
  const hasOnboarded = useStore(s=>s.hasOnboarded)
  const setFolder = useStore(s=>s.setFolder)
  const scanProjects = useStore(s=>s.scanProjects)
  const resetToSeed = useStore(s=>s.resetToSeed)
  const projects = useStore(s=>s.projects)
  const addProjectFromFolder = useStore(s=>s.addProjectFromFolder)
  const locale = useStore(s=>s.locale)
  const setLocale = useStore(s=>s.setLocale)
  const t = useT()
  const [scanning, setScanning]=useState(false)
  const [found, setFound]=useState<any[]|null>(null)
  const [selected, setSelected]=useState<Set<string>>(new Set())
  const [rescanRoot, setRescanRoot]=useState<string|null>(null)

  const handleRescan = async()=>{
    // Десктоп: нативный диалог + чтение через plugin-fs
    if(isTauri()){
      try{
        const root = await tauriPickFolder()
        if(!root) return
        setScanning(true)
        setFolder(root)
        setRescanRoot(root)
        const { projectsFound } = await scanNativeFolder(root)
        if(!projectsFound.length){
          alert('No projects found — create one manually via + New project')
        }
        setFound(projectsFound)
        setSelected(new Set(projectsFound.map((p:any)=>p.name)))
      }catch(e:any){
        alert(e?.message ?? 'Failed to read folder')
      }finally{
        setScanning(false)
      }
      return
    }
    if('showDirectoryPicker' in window){
      try{
        // @ts-ignore
        const handle = await (window as any).showDirectoryPicker({mode:'read'})
        setScanning(true)
        setFolder(`~/${handle.name}`)
        const { projectsFound } = await scanDirectoryHandle(handle)
        if(!projectsFound.length){
          alert('No projects found — create one manually via + New project')
        }
        setFound(projectsFound)
        setSelected(new Set(projectsFound.map((p:any)=>p.name)))
        setScanning(false)
        return
      }catch(e:any){
        if(e?.name==='AbortError') return
      }
    } else {
      alert('File System Access API not supported — use + New project to add projects manually')
    }
  }

  const handleAdd = ()=>{
    if(!found) return
    const toAdd = found.filter((f:any)=> selected.has(f.name))
    scanProjects(toAdd, rescanRoot ? { rootPath: rescanRoot } : undefined)
    setFound(null)
    setRescanRoot(null)
  }

  return (
    <div className="space-y-5 animate-in max-w-3xl">
      <div><h1 className="text-2xl font-bold">{t('settings.title')}</h1><p className="text-sm text-zinc-500">{t('settings.subtitle')}</p></div>

      <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
        <h3 className="font-semibold">{t('settings.languageTitle')}</h3>
        <p className="text-sm text-zinc-500 mt-1">{t('settings.languageDesc')}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {locales.map(l=>{
            const cov = getCoverage(l.code)
            const count = getTranslatedCount(l.code)
            const total = getTotalKeys()
            return (
            <button
              key={l.code}
              onClick={()=> setLocale(l.code)}
              className={`p-3 rounded-xl border flex flex-col gap-2 text-left ${locale===l.code?'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white':'bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
            >
              <div className="flex items-center gap-3 w-full">
                <span className="text-xl">{l.flag}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{l.label}</div>
                  <div className="text-xs opacity-60">{l.code.toUpperCase()} · {count}/{total}</div>
                </div>
                {locale===l.code ? <span>✓</span> : <span className="text-xs font-medium opacity-60">{cov}%</span>}
              </div>
              <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width:`${cov}%`, background: cov===100 ? '#10b981' : cov>80 ? '#f59e0b' : '#ef4444' }} />
              </div>
            </button>
          )})}
        </div>
        <div className="mt-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border p-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium">Переведено</div>
            <div className="text-xs text-zinc-500">{getTranslatedCount(locale)}/{getTotalKeys()} ключей · {getCoverage(locale)}%</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono">{locales.find(l=>l.code===locale)?.label}</div>
            <div className="text-[11px] text-zinc-500">Текущий язык</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-zinc-500">EN 100% · RU 100% — полный паритет. Добавь новый язык — процент посчитается автоматически.</div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
        <h3 className="font-semibold">{t('settings.projectsFolder')}</h3>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 font-mono text-sm bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2 border">{folder ?? '— не выбрана'}</div>
          <button onClick={handleRescan} disabled={scanning} className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm">{scanning? t('settings.scanning'): t('settings.rescan')}</button>
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={async()=>{
            // Десктоп: нативный диалог + реальный скан + watch-корень
            if(isTauri()){
              try{
                const path = await tauriPickFolder()
                if(!path) return
                const info = await scanNativeProject(path)
                const created = addProjectFromFolder({ ...info, customPath: path })
                registerNativeRoot(created.id, path)
              }catch(e:any){ alert(e?.message ?? 'Failed to add project') }
              return
            }
            if('showDirectoryPicker' in window){
              try{
                // @ts-ignore
                const handle = await (window as any).showDirectoryPicker({mode:'read'})
                const info = await readFolderHandle(handle)
                try{ addProjectFromFolder(info) }catch(e:any){ alert(e?.message) }
              }catch(e:any){ if(e?.name!=='AbortError') alert(e?.message) }
            } else {
              const p = prompt(t('projects.manualPath') + ':')
              if(p){ const name = p.split('/').filter(Boolean).pop() || 'NewProject'; try{ addProjectFromFolder({name, files:[], hasGit:false, customPath:p}) }catch(e:any){ alert(e?.message)}}
            }
          }} className="px-3 py-1.5 rounded-xl border bg-white dark:bg-zinc-900 text-xs">📁 {t('projects.addFolder')}</button>
          <span className="text-xs text-zinc-500 py-1.5">{t('projects.addFolderDesc')}</span>
        </div>
        <p className="text-xs text-zinc-500 mt-2">{t('settings.projectsFolderDesc')}</p>
        {found && (
          <div className="mt-4 border rounded-xl divide-y">
            {found.map((f:any)=>(
              <label key={f.name} className="flex items-center gap-3 px-4 py-2.5">
                <input type="checkbox" checked={selected.has(f.name)} onChange={e=>{ const n=new Set(selected); if(e.target.checked) n.add(f.name); else n.delete(f.name); setSelected(n)}} />
                <span className="text-sm font-medium">{f.name}</span>
                <span className="text-xs text-zinc-500 ml-auto">{f.files?.slice(0,2).join(' · ')}</span>
              </label>
            ))}
            <div className="p-3 flex justify-end gap-2">
              <button onClick={()=>setFound(null)} className="text-sm px-3 py-1.5 rounded border">{t('common.cancel')}</button>
              <button onClick={handleAdd} className="text-sm px-4 py-1.5 rounded bg-violet-600 text-white">{t('onboarding.addSelected')} ({selected.size})</button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
        <h3 className="font-semibold">{t('settings.dataStorage')}</h3>
        <div className="text-sm text-zinc-500 mt-1">{t('settings.dataStorageDesc')}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={()=>{ if(confirm('Load demo data? This will add 6 fictional projects — you can clear again afterwards.')) resetToSeed()}} className="px-4 py-2 rounded-xl border text-sm">{t('settings.resetDemo')} (demo)</button>
          <button onClick={()=>{ if(confirm('Clear all data? This will delete all projects, tasks, ideas — starts empty.')){ const store = useStore.getState() as any; if(store.clearAll) store.clearAll(); localStorage.removeItem('vibeboard-store'); localStorage.removeItem('vb-theme'); location.reload()}}} className="px-4 py-2 rounded-xl border text-sm hover:bg-red-50 bg-red-50 dark:bg-red-950/20">{t('settings.clearStorage')} — очистить всё</button>
          <button onClick={()=>{ const data = JSON.stringify({projects}, null, 2); const blob=new Blob([data],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='vibeboard-export.json'; a.click(); URL.revokeObjectURL(url)}} className="px-4 py-2 rounded-xl border text-sm">{t('settings.exportJSON')}</button>
        </div>
        <div className="mt-3 text-xs text-zinc-500">{t('settings.onboarded')}: {hasOnboarded?'yes':'no'} · {t('settings.projects')}: {projects.length} · {projects.length===0 ? 'пусто — демо удалено' : ''}</div>
        {projects.length>0 && <button onClick={()=>{ if(confirm('Удалить все проекты и задачи? Останется пустая доска.')){ const s = useStore.getState() as any; s.clearAll(); location.reload()}}} className="mt-2 text-xs px-3 py-1.5 rounded-full bg-red-600 text-white">Удалить все проекты</button>}
      </div>

      <div id="integrations" className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Интеграции — экосистема (пункт 5, теперь в Настройках)</h3>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30">перенесено</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Подключи редакторы. Всё local-first — токены не уходят с устройства. Раньше была отдельная вкладка /integrations → теперь здесь.</p>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          {[
            {id:'vscode', name:'VS Code', desc:'Открывай проект из VibeBoard в 1 клик. Статус-бар WEB-001 72%.', icon:'🟦', status:'готов'},
            {id:'zed', name:'Zed', desc:'Лёгкий редактор, протокол zed://open', icon:'⚡', status:'готов'},
            {id:'opencode', name:'OpenCode', desc:'Присылай саммари завершённых сессий в агента через локальный хук.', icon:'◉', status:'готов'},
            {id:'claude', name:'Claude Code', desc:'То же для Claude Code — свой URL хука ниже.', icon:'✦', status:'готов'},
            {id:'github', name:'GitHub', desc:'Read-only: репы → проекты, issues → Ideas, PR → Review. Пока не реализовано.', icon:'🐙', status:'скоро'},
          ].map(i=>(
            <div key={i.id} className="border rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800">
              <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-900 border flex items-center justify-center text-sm">{i.icon}</span><span className="text-sm font-medium">{i.name}</span><span className={`ml-auto text-[11px] px-1.5 py-0.5 rounded-full border ${i.status==='готов'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'}`}>{i.status}</span></div>
              <div className="text-xs text-zinc-500 mt-1">{i.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          {(['opencode', 'claude'] as AgentId[]).map(agent => (
            <AgentHookField key={agent} agent={agent} />
          ))}
        </div>
        <details className="mt-3 border rounded-xl bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
          <summary className="px-3 py-2.5 text-xs font-medium cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700">Как получить хук? — пошагово</summary>
          <div className="px-3 pb-3 space-y-3 text-xs leading-relaxed">
            <div>
              <div className="font-medium">◉ OpenCode — ничего ставить не надо</div>
              <ol className="mt-1 ml-4 list-decimal space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>Запусти сервер агента в терминале:<br />
                  <code className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border font-mono text-[11px]">opencode serve --port 4096 --cors http://localhost:5173</code><br />
                  <span className="text-[11px]">порт VibeBoard подставь свой (адрес dev-сервера); без пароля — VibeBoard не умеет basic auth.</span>
                </li>
                <li>Проверь: <code className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border font-mono text-[11px]">curl localhost:4096/global/health</code> → <code className="font-mono text-[11px]">{`{"healthy":true}`}</code></li>
                <li>Вставь <code className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border font-mono text-[11px]">http://localhost:4096</code> в поле выше и жми ◉ под саммари — VibeBoard сам создаст сессию (<code className="font-mono text-[11px]">POST /session</code>) и положит саммари первым сообщением (<code className="font-mono text-[11px]">POST /session/:id/message</code>).</li>
              </ol>
            </div>
            <div>
              <div className="font-medium">✦ Claude Code — через мини-relay (входит в проект)</div>
              <ol className="mt-1 ml-4 list-decimal space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>Запусти приёмник:<br />
                  <code className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border font-mono text-[11px]">node scripts/vibeboard-agent-relay.mjs --port 4100</code><br />
                  <span className="text-[11px]">слушает только 127.0.0.1, складывает саммари в <code className="font-mono">~/VIBEBOARD_INBOX.md</code>. Нужен только node, зависимостей нет.</span>
                </li>
                <li>Вставь <code className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border font-mono text-[11px]">http://127.0.0.1:4100/hook</code> в поле выше.</li>
                <li>Чтобы Claude подбирал саммари сам — хук SessionStart в <code className="font-mono text-[11px]">.claude/settings.json</code> проекта:
                  <pre className="mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border font-mono text-[11px] overflow-auto">{`{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command",
        "command": "cat ~/VIBEBOARD_INBOX.md 2>/dev/null || true" }] }
    ]
  }
}`}</pre>
                </li>
              </ol>
            </div>
            <div className="text-[11px] text-zinc-500">Свой формат? Вставь любой свой URL — туда уйдёт сырой POST <code className="font-mono">{`{sessionId, goal, summary, tasksCompleted}`}</code>. В Tauri-сборке добавь origin приложения в <code className="font-mono">--cors</code>.</div>
          </div>
        </details>
        <div className="mt-3 border rounded-xl p-3 bg-zinc-50 dark:bg-zinc-800">
            <div className="text-xs font-medium">GitHub token (local only) <span className="text-zinc-400">— скоро</span></div>
            <div className="mt-2 flex gap-2">
              <input id="gh-token-input" placeholder="ghp_…" disabled defaultValue={localStorage.getItem('vb-github-token')||''} onBlur={e=> localStorage.setItem('vb-github-token', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg border bg-white dark:bg-zinc-900 text-xs font-mono disabled:opacity-50" />
              <button disabled title="Синк ещё не реализован" className="px-3 py-1.5 rounded-lg bg-zinc-300 text-white dark:bg-zinc-700 dark:text-zinc-400 text-xs cursor-not-allowed">Save</button>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
        <h3 className="font-semibold">Фундамент Desktop & данные — пункт 6</h3>
        <div className="text-xs text-zinc-500 mt-1">Сейчас: Zustand persist (localStorage). Готово: Dexie схемы + SQLite план. Файл <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">src/lib/db.ts</code></div>
        <pre className="mt-3 text-[11px] font-mono bg-zinc-50 dark:bg-zinc-800 border rounded-xl p-3 overflow-auto">{`projects(id,code) / tasks / ideas / notes / sessions / activities
→ Dexie: version(1).stores({...})
→ Tauri: tauri-plugin-sql (SQLite) — тот же SQL
→ Синк: y-crdt/automerge по WebSocket (Tauri)`}</pre>
        <div className="mt-2 text-xs text-zinc-500">Здоровье проекта считается локально: <code>computeHealth()</code> `src/lib/health.ts:1` — прогресс·0.35 + блокеры·0.25 + свежесть·0.2 + git·0.2.</div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-5">
        <h3 className="font-semibold">{t('settings.about')}</h3>
        <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{t('settings.aboutDesc')}</p>
        <div className="mt-3 text-xs font-mono text-zinc-400">{t('settings.version')}</div>
      </div>
    </div>
  )
}
