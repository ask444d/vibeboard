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

type TauriShell = { shell?: { open(p: string): Promise<void> }; opener?: { openPath(p: string): Promise<void> }; os?: { platform(): Promise<string> } }
function getTauri(): TauriShell | null {
  if (!isTauri()) return null
  return (window as unknown as { __TAURI__?: TauriShell }).__TAURI__ ?? null
}

export async function tauriOpen(path:string): Promise<boolean>{
  const safe = sanitizeLocalPath(path)
  if (!safe) return false
  const tauri = getTauri()
  if(!tauri) return false
  try {
    if(tauri.shell?.open){ await tauri.shell.open(safe); return true }
    if(tauri.opener?.openPath && !safe.startsWith('file://')){ await tauri.opener.openPath(safe); return true }
  } catch { return false }
  return false
}

export async function tauriOpenTerminal(cwd:string): Promise<boolean>{
  const safe = sanitizeLocalPath(cwd)
  if (!safe) return false
  const tauri = getTauri()
  if(!tauri) return false
  try {
    // Открываем папку в Finder/Explorer; настоящий терминал — через shell.Command в Tauri v2 (нужен plugin-shell)
    const target = safe.startsWith('file://') ? safe : `file://${safe.replace(/^~\//,'')}`
    if(tauri.shell?.open){ await tauri.shell.open(target); return true }
  } catch { return false }
  return false
}

let infoCache: { isTauri:boolean; platform:string } | null = null
export function getTauriInfoSync(){
  if (!infoCache) infoCache = { isTauri: isTauri(), platform: 'browser' }
  return infoCache
}
export async function getTauriInfo(){
  if (!isTauri()) return { isTauri:false, platform:'browser' }
  if (infoCache && infoCache.platform !== 'browser') return infoCache
  const tauri = getTauri()
  try {
    const platform = tauri?.os?.platform ? await tauri.os.platform() : 'desktop'
    infoCache = { isTauri:true, platform }
    return infoCache
  } catch {
    infoCache = { isTauri:true, platform:'desktop' }
    return infoCache
  }
}
