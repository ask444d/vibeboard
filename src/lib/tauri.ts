import { open as shellOpen } from '@tauri-apps/plugin-shell'
import { openPath as openerOpenPath, revealItemInDir } from '@tauri-apps/plugin-opener'

export const isTauri = () =>
  typeof window !== 'undefined' &&
  !!((window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }).__TAURI__ ||
     (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)

// Разрешаем только локальные пути / file:// — никаких http/javascript через shell.open
function sanitizeLocalPath(path: string): string | null {
  const p = path.trim()
  if (!p) return null
  const low = p.toLowerCase()
  if (low.startsWith('javascript:') || low.startsWith('data:')) return null
  if (/^https?:\/\//i.test(p)) return null
  if (p.startsWith('file://')) {
    try {
      const u = new URL(p)
      if (u.protocol !== 'file:') return null
      return p
    } catch { return null }
  }
  if (p.startsWith('/') || p.startsWith('~/') || /^[A-Za-z]:\\/.test(p)) return p.slice(0, 500)
  return null
}

/** Открыть путь приложением по умолчанию (папка → Finder/Explorer, файл → редактор). */
export async function tauriOpen(path: string): Promise<boolean> {
  if (!isTauri()) return false
  const safe = sanitizeLocalPath(path)
  if (!safe) return false
  try {
    await shellOpen(safe)
    return true
  } catch {
    return false
  }
}

/** Показать путь в файловом менеджере (Reveal in Finder). */
export async function tauriReveal(path: string): Promise<boolean> {
  if (!isTauri()) return false
  const safe = sanitizeLocalPath(path)
  if (!safe || safe.startsWith('file://')) return false
  try {
    await revealItemInDir(safe)
    return true
  } catch {
    return false
  }
}

export async function tauriOpenTerminal(cwd: string): Promise<boolean> {
  if (!isTauri()) return false
  const safe = sanitizeLocalPath(cwd)
  if (!safe || safe.startsWith('file://')) return false
  try {
    // Честный маппинг: настоящего терминала через shell-плагин нет,
    // открываем путь — для папки это Finder/Explorer.
    await openerOpenPath(safe)
    return true
  } catch {
    return false
  }
}

let infoCache: { isTauri: boolean; platform: string } | null = null
export function getTauriInfoSync() {
  if (!infoCache) infoCache = { isTauri: isTauri(), platform: isTauri() ? 'desktop' : 'browser' }
  return infoCache
}
export async function getTauriInfo() {
  // Без plugin-os платформу не определяем — достаточно факта десктопа
  return getTauriInfoSync()
}
