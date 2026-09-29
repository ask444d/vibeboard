import * as vscode from 'vscode'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { exec, execFile } from 'child_process'
import initSqlJs, { type SqlJsStatic } from 'sql.js'

// Minimal shapes matching the VibeBoard app state (see src/lib/types.ts).
// Only fields the status bar needs — extra fields are ignored.
interface VbProject {
  id: string
  code: string
  name: string
  status: string
  local_path?: string
  progress?: number
}

interface VbTask {
  id: string
  project_id: string
  status: string
}

interface VbState {
  projects: VbProject[]
  tasks: VbTask[]
}

const APP_ID = 'com.vibeboard.app'
const DB_FILE = 'vibeboard.db'
const STORE_KEY = 'vibeboard-store'

let sql: SqlJsStatic | null = null
let statusBar: vscode.StatusBarItem
let refreshTimer: NodeJS.Timeout | undefined

function expandHome(p: string): string {
  if (p === '~') return os.homedir()
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2))
  return p
}

function defaultDbPath(): string {
  const home = os.homedir()
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', APP_ID, DB_FILE)
  }
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || path.join(home, 'AppData', 'Roaming')
    return path.join(base, APP_ID, DB_FILE)
  }
  const xdg = process.env.XDG_CONFIG_HOME || path.join(home, '.config')
  return path.join(xdg, APP_ID, DB_FILE)
}

function resolveDbPath(): string {
  const override = vscode.workspace.getConfiguration('vibeboard').get<string>('dbPath', '').trim()
  if (override) {
    const p = expandHome(override)
    return p.endsWith('.db') ? p : path.join(p, DB_FILE)
  }
  return defaultDbPath()
}

async function loadState(): Promise<VbState | null> {
  const dbPath = resolveDbPath()
  if (!fs.existsSync(dbPath)) return null
  if (!sql) {
    sql = await initSqlJs({
      locateFile: (file: string) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
    })
  }
  let db = null
  try {
    db = new sql.Database(new Uint8Array(fs.readFileSync(dbPath)))
    const res = db.exec(`SELECT value FROM kv WHERE key = '${STORE_KEY}'`)
    if (!res.length || !res[0].values.length) return null
    const raw = res[0].values[0][0] as string
    const parsed = JSON.parse(raw) as { state?: Partial<VbState> } & Partial<VbState>
    // zustand persist wraps payload as { state, version }
    const state = (parsed.state ?? parsed) as Partial<VbState>
    return {
      projects: Array.isArray(state.projects) ? (state.projects as VbProject[]) : [],
      tasks: Array.isArray(state.tasks) ? (state.tasks as VbTask[]) : [],
    }
  } catch {
    return null
  } finally {
    try {
      db?.close()
    } catch {
      // ignore
    }
  }
}

function pickProject(state: VbState, selectedId: string | undefined): VbProject | undefined {
  const folders = (vscode.workspace.workspaceFolders ?? []).map(f => f.uri.fsPath)
  let best: VbProject | undefined
  let bestLen = -1
  for (const p of state.projects) {
    if (!p.local_path) continue
    const lp = expandHome(p.local_path)
    for (const wf of folders) {
      if ((wf === lp || wf.startsWith(lp + path.sep)) && lp.length > bestLen) {
        best = p
        bestLen = lp.length
      }
    }
  }
  if (best) return best
  if (selectedId) {
    const stored = state.projects.find(p => p.id === selectedId)
    if (stored) return stored
  }
  return state.projects[0]
}

function summarize(project: VbProject, tasks: VbTask[]): { done: number; total: number; progress: number } {
  const mine = tasks.filter(t => t.project_id === project.id)
  const done = mine.filter(t => t.status === 'DONE').length
  const progress = typeof project.progress === 'number' ? project.progress : 0
  return { done, total: mine.length, progress }
}

async function refresh(statusBar: vscode.StatusBarItem, context: vscode.ExtensionContext): Promise<void> {
  try {
    const state = await loadState()
    if (!state || state.projects.length === 0) {
      statusBar.text = '$(pulse) VibeBoard: no data'
      statusBar.tooltip = 'Open the VibeBoard desktop app at least once. Click to retry.'
      statusBar.command = 'vibeboard.refresh'
      statusBar.show()
      return
    }
    const selectedId = context.globalState.get<string | undefined>('vibeboard.selectedProjectId')
    const project = pickProject(state, selectedId)
    if (!project) {
      statusBar.text = '$(pulse) VibeBoard: no data'
      statusBar.tooltip = 'Click to retry.'
      statusBar.command = 'vibeboard.refresh'
      statusBar.show()
      return
    }
    const { done, total, progress } = summarize(project, state.tasks)
    statusBar.text = `$(pulse) ${project.code} · ${done}/${total} · ${progress}%`
    statusBar.tooltip = `${project.name} (${project.status})\n${done}/${total} tasks done · ${progress}%\nClick to switch project.`
    statusBar.command = 'vibeboard.selectProject'
    statusBar.show()
  } catch {
    statusBar.text = '$(pulse) VibeBoard: error'
    statusBar.tooltip = 'Failed to read the VibeBoard database. Click to retry.'
    statusBar.command = 'vibeboard.refresh'
    statusBar.show()
  }
}

function currentOrSelectedProject(context: vscode.ExtensionContext): Promise<VbProject | undefined> {
  return (async () => {
    const state = await loadState()
    if (!state) return undefined
    return pickProject(state, context.globalState.get<string | undefined>('vibeboard.selectedProjectId'))
  })()
}

function revealInOs(dir: string): void {
  if (process.platform === 'darwin') execFile('open', [dir])
  else if (process.platform === 'win32') execFile('explorer', [dir])
  else execFile('xdg-open', [dir])
}

function openDashboard(): void {
  const configured = vscode.workspace.getConfiguration('vibeboard').get<string>('dashboardCommand', '').trim()
  if (configured) {
    exec(configured)
    return
  }
  if (process.platform === 'darwin') execFile('open', ['-a', 'VibeBoard'])
  else if (process.platform === 'win32') execFile('cmd', ['/c', 'start', '', 'VibeBoard'])
  else execFile('vibeboard')
}

function startTimer(statusBar: vscode.StatusBarItem, context: vscode.ExtensionContext): void {
  if (refreshTimer) clearInterval(refreshTimer)
  const sec = Math.max(5, vscode.workspace.getConfiguration('vibeboard').get<number>('refreshIntervalSec', 30))
  refreshTimer = setInterval(() => void refresh(statusBar, context), sec * 1000)
}

export function activate(context: vscode.ExtensionContext): void {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
  statusBar.text = '$(pulse) VibeBoard…'
  statusBar.tooltip = 'Loading VibeBoard status…'
  statusBar.command = 'vibeboard.refresh'
  statusBar.show()
  context.subscriptions.push(statusBar)

  context.subscriptions.push(
    vscode.commands.registerCommand('vibeboard.refresh', () => void refresh(statusBar, context)),
    vscode.commands.registerCommand('vibeboard.selectProject', async () => {
      const state = await loadState()
      if (!state || state.projects.length === 0) {
        void vscode.window.showWarningMessage('VibeBoard: no projects found. Open the desktop app at least once.')
        return
      }
      const picked = await vscode.window.showQuickPick(
        state.projects.map(p => {
          const { done, total, progress } = summarize(p, state.tasks)
          return { label: `${p.code} — ${p.name}`, description: `${done}/${total} · ${progress}%`, id: p.id }
        }),
        { placeHolder: 'Select VibeBoard project for the status bar' },
      )
      if (picked) {
        await context.globalState.update('vibeboard.selectedProjectId', picked.id)
        await refresh(statusBar, context)
      }
    }),
    vscode.commands.registerCommand('vibeboard.openFolder', async () => {
      const project = await currentOrSelectedProject(context)
      if (!project?.local_path) {
        void vscode.window.showWarningMessage('VibeBoard: no project folder to open.')
        return
      }
      revealInOs(expandHome(project.local_path))
    }),
    vscode.commands.registerCommand('vibeboard.openDashboard', () => openDashboard()),
    vscode.workspace.onDidSaveTextDocument(() => void refresh(statusBar, context)),
    vscode.workspace.onDidChangeWorkspaceFolders(() => void refresh(statusBar, context)),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('vibeboard')) {
        startTimer(statusBar, context)
        void refresh(statusBar, context)
      }
    }),
  )

  startTimer(statusBar, context)
  void refresh(statusBar, context)
}

export function deactivate(): void {
  if (refreshTimer) clearInterval(refreshTimer)
}
