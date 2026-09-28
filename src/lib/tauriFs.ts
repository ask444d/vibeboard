import { readDir, readTextFile, stat } from '@tauri-apps/plugin-fs'
import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { IGNORED_DIRS, IGNORED_EXT, LANGUAGE_EXT } from './constants'
import {
  MAX_JSON_BYTES,
  MAX_SCAN_DEPTH,
  MAX_FILE_BYTES,
  PROJECT_MARKERS,
  safeParseJson,
  parseVibeConfigText,
  type PkgJson,
  type ScannedProject,
  type VibeConfig,
  type VirtualFile,
} from './utils'
import { parseGitLogText } from './git'

// Нативная работа с файлами для Tauri-десктопа (plugin-fs / plugin-dialog).
// В браузере НЕ используется — там File System Access API (utils.ts).
// Возвращает те же структуры (ScannedProject), что и скан через хэндлы,
// поэтому стор и UI их потребляют без изменений.

function sepFor(p: string): string {
  return p.includes('\\') ? '\\' : '/'
}

export function joinPath(...parts: string[]): string {
  const sep = sepFor(parts[0] ?? '/')
  return parts
    .join(sep)
    .replace(/[\\/]+/g, sep)
}

export function baseName(p: string): string {
  const clean = p.replace(/[\\/]+$/, '')
  const parts = clean.split(/[\\/]/).filter(Boolean)
  return parts.pop() ?? p
}

/** Нативный диалог выбора папки. null — пользователь отменил. */
export async function tauriPickFolder(title = 'Choose projects folder'): Promise<string | null> {
  try {
    const sel = await dialogOpen({ directory: true, multiple: false, title })
    if (!sel) return null
    if (Array.isArray(sel)) return sel[0] ?? null
    return sel
  } catch {
    return null
  }
}

async function readJsonFile(path: string): Promise<unknown> {
  try {
    const st = await stat(path)
    if (!Number.isFinite(st.size) || st.size <= 0 || st.size > MAX_JSON_BYTES) return null
    const txt = await readTextFile(path)
    return safeParseJson(txt)
  } catch {
    return null
  }
}

function asPkgJson(v: unknown): PkgJson | undefined {
  return v && typeof v === 'object' ? (v as PkgJson) : undefined
}

async function readTopNames(dir: string): Promise<{ files: string[]; hasGit: boolean }> {
  const files: string[] = []
  let hasGit = false
  try {
    const entries = await readDir(dir)
    for (const e of entries) {
      if (!e.name) continue
      files.push(e.name)
      if (e.name === '.git') hasGit = true
    }
  } catch { /* нет доступа — пусто */ }
  return { files, hasGit }
}

async function collectWalk(dir: string, prefix: string, out: VirtualFile[], depth: number): Promise<void> {
  if (depth > MAX_SCAN_DEPTH) return
  let entries
  try {
    entries = await readDir(dir)
  } catch {
    return
  }
  for (const e of entries) {
    const name = e.name
    if (!name) continue
    const rel = prefix ? `${prefix}/${name}` : name
    const full = joinPath(dir, name)
    if (e.isDirectory) {
      if (e.isSymlink) continue // не ходим по ссылкам — защита от циклов
      if (IGNORED_DIRS.has(name)) continue
      await collectWalk(full, rel, out, depth + 1)
    } else if (e.isFile) {
      if (name.startsWith('.')) continue
      const dot = name.lastIndexOf('.')
      const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
      if (!ext || IGNORED_EXT.has(ext)) continue
      if (!LANGUAGE_EXT[ext] && ext !== 'json' && ext !== 'md') continue
      try {
        const st = await stat(full)
        const bytes = st.size
        if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_FILE_BYTES) continue
        out.push({ path: rel, bytes, ext })
      } catch { /* файл пропал между листингом и stat — пропускаем */ }
    }
  }
}

/** Рекурсивный сбор файлов для анализа языков — аналог analyzeLanguagesFromHandle. */
export async function collectNativeVfiles(rootPath: string): Promise<VirtualFile[]> {
  const out: VirtualFile[] = []
  await collectWalk(rootPath, '', out, 0)
  return out
}

async function readNativeVibeConfig(dir: string): Promise<VibeConfig | null> {
  try {
    const txt = await readTextFile(joinPath(dir, '.vibeboard.json'))
    return parseVibeConfigText(txt)
  } catch {
    return null
  }
}

async function readNativeGitHistory(dir: string) {
  try {
    const txt = await readTextFile(joinPath(dir, '.git', 'logs', 'HEAD'))
    return parseGitLogText(txt)
  } catch {
    return []
  }
}

async function buildScannedProject(dir: string, name: string, opts: { requireMarker: boolean }): Promise<ScannedProject | null> {
  const { files, hasGit } = await readTopNames(dir)
  const fileSet = new Set(files)
  if (opts.requireMarker && !hasGit && !PROJECT_MARKERS.some(m => fileSet.has(m))) return null
  const pkg = asPkgJson(await readJsonFile(joinPath(dir, 'package.json')))
  const vibe = await readNativeVibeConfig(dir)
  let vfiles: VirtualFile[] = []
  try {
    vfiles = await collectNativeVfiles(dir)
  } catch { /* игнорируем */ }
  const gitHistory = hasGit ? await readNativeGitHistory(dir) : []
  return { name, files, packageJson: pkg, hasGit, vfiles, gitHistory, vibeConfig: vibe }
}

/** Скан корня проектов — нативный аналог scanDirectoryHandle. */
export async function scanNativeFolder(rootPath: string): Promise<{ projectsFound: ScannedProject[] }> {
  const out: ScannedProject[] = []
  let entries
  try {
    entries = await readDir(rootPath)
  } catch {
    return { projectsFound: [] }
  }
  for (const e of entries) {
    if (!e.isDirectory || !e.name) continue
    try {
      const found = await buildScannedProject(joinPath(rootPath, e.name), e.name, { requireMarker: true })
      if (found) out.push(found)
    } catch { /* пропускаем проблемную папку */ }
  }
  return { projectsFound: out }
}

/** Одна явно выбранная папка — всегда считаем проектом (пользователь так решил). */
export async function scanNativeProject(dirPath: string): Promise<ScannedProject> {
  const found = await buildScannedProject(dirPath, baseName(dirPath), { requireMarker: false })
  if (!found) throw new Error('Failed to read folder')
  return found
}
