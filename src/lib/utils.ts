import type { Project, ProjectType, ProjectLanguage, Task } from './types'
import { IGNORED_DIRS, IGNORED_EXT, LANGUAGE_EXT, TECH_DETECTORS, languageColor } from './constants'
import { getExtraDetectors, getLanguageColorExt } from './plugins'

// id — crypto-safe, без коллизий в быстрых циклах
export const uid = () => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  } catch { /* fallback */ }
  return `${Date.now().toString(36)}-${Math.floor(Math.random()*1e9).toString(36)}`
}
export const nowIso = () => new Date().toISOString()

const CODE_RE = /^(WEB|APP|GAME|BOT|AI|TOOL|OTHER)-(\d{3})$/
export function generateProjectCode(type: ProjectType, existing: Project[]): string {
  let max = 0
  for (const p of existing) {
    const m = CODE_RE.exec(p.code)
    if (m && m[1] === type) {
      const n = parseInt(m[2], 10)
      if (!isNaN(n) && n > max) max = n
    }
  }
  return `${type}-${String(max+1).padStart(3,'0')}`
}

export function calcProgress(tasks: Task[]): number {
  if(!tasks.length) return 0
  const done = tasks.filter(t=>t.status==='DONE').length
  return Math.round(done / tasks.length * 100)
}

export function getNextTask(tasks: Task[]): Task | undefined {
  const prio: Record<string,number> = { URGENT:4, HIGH:3, MEDIUM:2, LOW:1 }
  const order: Record<string,number> = { IN_PROGRESS:0, REVIEW:1, TODO:2, BLOCKED:3, CANCELLED:4, DONE:5 }
  let best: Task | undefined
  let bestS = Infinity, bestP = -1
  for (const t of tasks) {
    if (t.status !== 'IN_PROGRESS' && t.status !== 'TODO' && t.status !== 'REVIEW' && t.status !== 'BLOCKED') continue
    const s = order[t.status] ?? 9
    const p = prio[t.priority] ?? 0
    if (s < bestS || (s === bestS && p > bestP)) { best = t; bestS = s; bestP = p }
  }
  return best
}

export function formatRelative(iso:string){
  const d = new Date(iso)
  const t = d.getTime()
  if (isNaN(t)) return '—'
  const diff = Date.now() - t
  if (diff < 0) return 'just now'
  const mins = Math.floor(diff/60000)
  if(mins<1) return 'just now'
  if(mins<60) return `${mins} min ago`
  const hrs = Math.floor(mins/60)
  if(hrs<24) return `${hrs}h ago`
  const days = Math.floor(hrs/24)
  if(days<7) return `${days}d ago`
  try { return d.toLocaleDateString() } catch { return '—' }
}

export function formatBytes(bytes:number){
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if(bytes<1024) return `${bytes} B`
  if(bytes<1024*1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1024/1024).toFixed(1)} MB`
}

// Language analysis - operates on virtual file list [{path,size,ext}] or actual FileSystem handles
export interface VirtualFile { path:string; bytes:number; ext:string }
export function analyzeLanguages(files: VirtualFile[]): ProjectLanguage[] {
  const map = new Map<string, number>()
  let total = 0
  for(const f of files){
    const parts = f.path.split('/')
    if(parts.some(p=> IGNORED_DIRS.has(p))) continue
    if(IGNORED_EXT.has(f.ext.toLowerCase())) continue
    const lang = LANGUAGE_EXT[f.ext.toLowerCase()]
    if(!lang) continue
    if(lang==='JSON' || lang==='Markdown') {
      // count but lower weight? keep as is but we filter small amounts later
    }
    const cur = map.get(lang) ?? 0
    map.set(lang, cur + f.bytes)
    total += f.bytes
  }
  if(total===0) return []
  const arr: ProjectLanguage[] = Array.from(map.entries()).map(([language, bytes])=>({
    id: uid(),
    project_id: '',
    language,
    bytes,
    percentage: Math.round(bytes/total*100)
  })).sort((a,b)=> b.bytes - a.bytes)
  // adjust rounding to 100
  let sum = arr.reduce((s,x)=> s+x.percentage,0)
  if(arr.length && sum!==100){
    arr[0].percentage += 100 - sum
  }
  return arr
}

type PkgJson = { dependencies?: Record<string,string>; devDependencies?: Record<string,string> }
const MAX_JSON_BYTES = 512 * 1024
export function safeParseJson(txt:string): unknown {
  if (txt.length > MAX_JSON_BYTES) return null
  try { return JSON.parse(txt) } catch { return null }
}

export function detectTechStack(fileNames: string[], packageJson?: PkgJson | null): string[] {
  const set = new Set<string>()
  const nameSet = new Set(fileNames)
  const has = (n:string)=> nameSet.has(n)
  for (const d of TECH_DETECTORS) {
    if (has(d.file)) for (const t of d.techs) set.add(t)
  }
  // extra detectors from plugins
  for(const d of getExtraDetectors()){
    if(has(d.file)) d.techs.forEach(t=> set.add(t))
  }

  if(packageJson && typeof packageJson === 'object'){
    const dep = packageJson.dependencies && typeof packageJson.dependencies === 'object' ? packageJson.dependencies : {}
    const dev = packageJson.devDependencies && typeof packageJson.devDependencies === 'object' ? packageJson.devDependencies : {}
    const deps: Record<string,string> = {}
    for (const [k,v] of Object.entries(dep)) { if (typeof v === 'string' && k !== '__proto__') deps[k] = v }
    for (const [k,v] of Object.entries(dev)) { if (typeof v === 'string' && k !== '__proto__') deps[k] = v }
    if(deps['react']) set.add('React')
    if(deps['next']) set.add('Next.js')
    if(deps['vue']) set.add('Vue')
    if(deps['svelte']) set.add('Svelte')
    if(deps['typescript']|| has('tsconfig.json')) set.add('TypeScript')
    if(deps['tailwindcss']) set.add('Tailwind CSS')
    if(deps['vite']) set.add('Vite')
    if(deps['astro']) set.add('Astro')
    if(deps['express']) set.add('Express')
    if(deps['fastify']) set.add('Fastify')
    if(deps['prisma']) set.add('Prisma')
    if(deps['electron']) set.add('Electron')
    if(deps['react-native']) set.add('React Native')
    if(deps['flutter'] || deps['dart']) set.add('Dart')
    // heuristics
    if(!set.has('TypeScript') && has('tsconfig.json')) set.add('TypeScript')
  } else {
    if(has('tsconfig.json')) set.add('TypeScript')
  }
  if(has('tailwind.config.js')||has('tailwind.config.ts')) set.add('Tailwind CSS')
  if(has('vite.config.ts')||has('vite.config.js')) set.add('Vite')
  if(has('next.config.js')||has('next.config.mjs')) set.add('Next.js')
  if(has('astro.config.mjs')) set.add('Astro')
  return Array.from(set)
}

// File System Access - scan folder handle (if available)
// Возвращает реальные данные: vfiles (для честного анализа языков) и gitHistory.
// Никакой синтетики и рандома — чего нет, того нет (пустые массивы).
import { readGitHistory, type GitCommit } from './git'
export interface ScannedProject { name:string; files:string[]; packageJson?:PkgJson; hasGit:boolean; vfiles:VirtualFile[]; gitHistory:GitCommit[] }

async function deepScanDir(dir:any): Promise<{vfiles:VirtualFile[]; gitHistory:GitCommit[]}>{
  let vfiles: VirtualFile[] = []
  try{ vfiles = await analyzeLanguagesFromHandle(dir) }catch(e){ console.warn('analyze',e) }
  let gitHistory: GitCommit[] = []
  try{ gitHistory = await readGitHistory(dir) }catch(e){ console.warn('git',e) }
  return { vfiles, gitHistory }
}

export function newestCommitIso(gitHistory:GitCommit[]): string|undefined {
  if(!gitHistory.length) return undefined
  let max = 0
  for(const c of gitHistory) if(Number.isFinite(c.timestamp) && c.timestamp>max) max=c.timestamp
  return max>0 ? new Date(max).toISOString() : undefined
}

export async function scanDirectoryHandle(handle: any): Promise<{projectsFound:ScannedProject[]}>{
  const entries: any[] = []
  for await (const entry of handle.values()){
    if(entry.kind==='directory') entries.push(entry)
  }
  const results: ScannedProject[] = []
  for(const dir of entries){
    try{
      const files: string[] = []
      let hasGit = false
      let pkg: PkgJson | undefined = undefined
      for await (const e of dir.values()){
        files.push(e.name)
        if(e.name==='.git') hasGit = true
        if(e.name==='package.json' && e.kind==='file'){
          try{
            const f = await e.getFile()
            if (f.size > MAX_JSON_BYTES) continue
            const txt = await f.text()
            const parsed = safeParseJson(txt)
            if (parsed && typeof parsed === 'object') pkg = parsed as PkgJson
          }catch{}
        }
      }
      // consider project only if has marker — пустые папки без маркеров не проекты
      const markers = ['.git','package.json','pubspec.yaml','Cargo.toml','requirements.txt','pyproject.toml','go.mod','pom.xml','build.gradle','build.gradle.kts','Gemfile','composer.json']
      const fileSet = new Set(files)
      const isProject = hasGit || markers.some(m=> fileSet.has(m))
      if(isProject){
        const { vfiles, gitHistory } = await deepScanDir(dir)
        results.push({ name: dir.name, files, packageJson: pkg, hasGit, vfiles, gitHistory })
      }
    }catch(e){ console.warn(e)}
  }
  return { projectsFound: results }
}

export async function readFolderHandle(handle:any): Promise<{name:string; files:string[]; packageJson?:PkgJson; hasGit:boolean; vfiles:VirtualFile[]; gitHistory:GitCommit[]}>{
  const name = handle.name ?? 'Unknown'
  const files: string[] = []
  let hasGit = false
  let pkg: PkgJson | undefined = undefined
  try{
    for await (const e of handle.values()){
      files.push(e.name)
      if(e.name==='.git') hasGit = true
      if(e.name==='package.json' && e.kind==='file'){
        try{
          const f = await e.getFile()
          if (f.size > MAX_JSON_BYTES) continue
          const txt = await f.text()
          const parsed = safeParseJson(txt)
          if (parsed && typeof parsed === 'object') pkg = parsed as PkgJson
        }catch{}
      }
    }
  }catch(e){ console.warn(e) }
  const { vfiles, gitHistory } = await deepScanDir(handle)
  return { name, files, packageJson:pkg, hasGit, vfiles, gitHistory }
}

export function inferProjectType(name:string, files:string[]): ProjectType {
  // сначала маркеры файлов — надежнее имени
  if(files.includes('pubspec.yaml')) return 'APP'
  if(files.includes('package.json')) return 'WEB'
  if(files.includes('Cargo.toml')) return 'TOOL'
  if(files.includes('go.mod')) return 'TOOL'
  const low = ` ${name.toLowerCase().replace(/[-_]/g,' ')} `
  if(/\bbot\b/.test(low)) return 'BOT'
  if(/\bai\b/.test(low)) return 'AI'
  if(/\bgame\b/.test(low)) return 'GAME'
  return 'OTHER'
}

export const MAX_SCAN_DEPTH = 4
export const MAX_FILE_BYTES = 10*1024*1024
export async function collectVirtualFiles(handle:any, prefix:string, out:VirtualFile[], depth=0){
  if(depth>MAX_SCAN_DEPTH) return
  try{
    for await (const entry of handle.values()){
      const name: string = entry.name
      if(IGNORED_DIRS.has(name)) continue
      const path = prefix ? `${prefix}/${name}` : name
      if(entry.kind==='file'){
        if (name.startsWith('.')) continue // .gitignore, .env — не языки
        const dot = name.lastIndexOf('.')
        const ext = dot > 0 ? name.slice(dot+1).toLowerCase() : ''
        if(!ext || IGNORED_EXT.has(ext)) continue
        if(!LANGUAGE_EXT[ext] && ext!=='json' && ext!=='md') continue
        try{
          const file = await entry.getFile()
          const bytes = file.size
          if(!Number.isFinite(bytes) || bytes<=0 || bytes>MAX_FILE_BYTES) continue
          out.push({ path, bytes, ext })
        }catch{}
      } else if(entry.kind==='directory'){
        await collectVirtualFiles(entry, path, out, depth+1)
      }
    }
  }catch(e){ console.warn('collect',e)}
}

export async function analyzeLanguagesFromHandle(handle:any): Promise<VirtualFile[]> {
  const out: VirtualFile[] = []
  await collectVirtualFiles(handle, '', out)
  return out
}

export interface VibeConfig { name?: string; type?: ProjectType; status?: import('./types').ProjectStatus; code?: string; description?: string; local_path?: string }
const VIBE_TYPES = new Set(['WEB','APP','GAME','BOT','AI','TOOL','OTHER'])
export async function readVibeConfig(handle:any): Promise<VibeConfig|null>{
  try{
    for await (const e of handle.values()){
      if(e.name==='.vibeboard.json' && e.kind==='file'){
        const f=await e.getFile()
        if (f.size > MAX_JSON_BYTES) return null
        const txt=await f.text()
        const parsed = safeParseJson(txt)
        if (!parsed || typeof parsed !== 'object') return null
        const p = parsed as Record<string, unknown>
        const out: VibeConfig = {}
        if (typeof p.name === 'string') out.name = p.name.slice(0,80)
        if (typeof p.type === 'string' && VIBE_TYPES.has(p.type)) out.type = p.type as ProjectType
        if (typeof p.code === 'string' && /^(WEB|APP|GAME|BOT|AI|TOOL|OTHER)-\d{3}$/.test(p.code)) out.code = p.code
        if (typeof p.description === 'string') out.description = p.description.slice(0,500)
        if (typeof p.local_path === 'string') out.local_path = p.local_path.slice(0,300)
        return out
      }
    }
  }catch{}
  return null
}

// DEMO-ONLY: синтетические файлы для демо-данных (seed.ts).
// НЕ использовать для реальных проектов — там либо настоящий скан, либо пусто.
export function syntheticFilesForProject(type: ProjectType, name:string): VirtualFile[]{
  // generate synthetic file list to show realistic language bars
  const presets: Record<string,{ext:string,bytes:number}[]> = {
    VibeBoard:[{ext:'ts',bytes:42000},{ext:'tsx',bytes:38000},{ext:'css',bytes:18000},{ext:'html',bytes:9000},{ext:'js',bytes:5000}],
    MedRef:[{ext:'dart',bytes:56000},{ext:'yaml',bytes:3000},{ext:'cpp',bytes:14000},{ext:'swift',bytes:8500}],
    VELMARA:[{ext:'cs',bytes:72000},{ext:'hlsl',bytes:10500},{ext:'shader',bytes:5200},{ext:'json',bytes:3000}],
    TelegramBot:[{ext:'py',bytes:34000},{ext:'md',bytes:4000},{ext:'json',bytes:3000}],
    'AI-Assistant':[{ext:'ts',bytes:32000},{ext:'py',bytes:18000},{ext:'css',bytes:6000}],
    SomeWebsite:[{ext:'js',bytes:28000},{ext:'css',bytes:15000},{ext:'html',bytes:9000},{ext:'json',bytes:4000}],
  }
  const base = presets[name] ?? (
    type==='WEB'? [{ext:'ts',bytes:30000},{ext:'css',bytes:12000},{ext:'html',bytes:7000}] :
    type==='APP'? [{ext:'dart',bytes:40000},{ext:'yaml',bytes:5000}] :
    type==='GAME'? [{ext:'cs',bytes:50000},{ext:'hlsl',bytes:10000}] :
    [{ext:'js',bytes:20000},{ext:'css',bytes:8000}]
  )
  // expand to multiple files
  const files: VirtualFile[] = []
  for(const b of base){
    const count = b.ext==='ts'||b.ext==='js' ? 6 : b.ext==='css'?3:2
    const per = Math.floor(b.bytes/count)
    for(let i=0;i<count;i++){
      files.push({ path: `src/file${i}.${b.ext}`, bytes: per + Math.floor(Math.random()*500), ext:b.ext })
    }
  }
  return files
}

export function getLanguageColor(lang:string){ 
  return getLanguageColorExt(lang) ?? languageColor(lang)
}
