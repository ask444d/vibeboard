import type { ProjectType, ProjectStatus, TaskStatus } from './types'

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Dart: '#00B4AB',
  CSS: '#563d7c',
  HTML: '#e34c26',
  Go: '#00ADD8',
  Swift: '#ffac45',
  Kotlin: '#A97BFF',
  'C++': '#f34b7d',
  'C#': '#178600',
  Java: '#b07219',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Shell: '#89e051',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  HLSL: '#aace60',
  ShaderLab: '#222c37',
  JSON: '#292929',
  Markdown: '#083fa1',
}

export const LANGUAGE_EXT: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript',
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  py: 'Python',
  rs: 'Rust',
  dart: 'Dart',
  css: 'CSS', scss: 'CSS', less: 'CSS',
  html: 'HTML',
  go: 'Go',
  swift: 'Swift',
  kt: 'Kotlin', kts: 'Kotlin',
  cpp: 'C++', cc: 'C++', cxx: 'C++', hpp: 'C++', h: 'C++',
  cs: 'C#',
  java: 'Java',
  php: 'PHP',
  rb: 'Ruby',
  sh: 'Shell', bash: 'Shell', zsh: 'Shell',
  vue: 'Vue',
  svelte: 'Svelte',
  hlsl: 'HLSL',
  shader: 'ShaderLab',
  json: 'JSON',
  md: 'Markdown',
}

export const IGNORED_DIRS = new Set([
  '.git','node_modules','dist','build','target','vendor','.cache','.next','.nuxt',
  'out','coverage','__pycache__','venv','.venv','env','.env','.idea','.vscode',
  'bin','obj','.turbo','.parcel-cache','.output','.vercel','.svelte-kit'
])

export const IGNORED_EXT = new Set([
  'png','jpg','jpeg','gif','webp','avif','ico','svg','mp4','mov','avi','mkv',
  'mp3','wav','ogg','flac','woff','woff2','ttf','otf','eot','pdf','zip','tar','gz','7z','exe','dll','so','dylib','a','o','class','pyc','lock'
])

// Единый источник простых детекторов файл → технологии.
// utils.detectTechStack стартует с этого списка + плагины из plugins.ts.
// package.json обрабатывается отдельно по dependencies (динамически).
export const TECH_DETECTORS: { file: string; techs: string[] }[] = [
  { file: 'pubspec.yaml', techs: ['Flutter','Dart'] },
  { file: 'Cargo.toml', techs: ['Rust'] },
  { file: 'requirements.txt', techs: ['Python'] },
  { file: 'pyproject.toml', techs: ['Python'] },
  { file: 'go.mod', techs: ['Go'] },
  { file: 'pom.xml', techs: ['Java','Maven'] },
  { file: 'build.gradle', techs: ['Java','Gradle'] },
  { file: 'build.gradle.kts', techs: ['Java','Gradle'] },
  { file: 'Gemfile', techs: ['Ruby'] },
  { file: 'composer.json', techs: ['PHP'] },
  { file: 'Dockerfile', techs: ['Docker'] },
]

export const PROJECT_TYPE_LABEL: Record<ProjectType,string> = {
  WEB:'Website', APP:'App', GAME:'Game', BOT:'Bot', AI:'AI', TOOL:'Tool', OTHER:'Other'
}
export const PROJECT_STATUS_META: Record<ProjectStatus,{label:string,dot:string,icon:string}> = {
  PLANNING: { label:'Planning', dot:'bg-blue-500', icon:'🔵' },
  ACTIVE: { label:'Active', dot:'bg-emerald-500', icon:'🟢' },
  PAUSED: { label:'Paused', dot:'bg-zinc-400', icon:'⚪' },
  BLOCKED: { label:'Blocked', dot:'bg-red-500', icon:'🔴' },
  TESTING: { label:'Testing', dot:'bg-violet-500', icon:'🟣' },
  COMPLETED: { label:'Completed', dot:'bg-emerald-600', icon:'✅' },
  ARCHIVED: { label:'Archived', dot:'bg-zinc-500', icon:'🗃️' },
}
export const TASK_STATUS_META: Record<TaskStatus,{label:string,icon:string,cls:string}> = {
  TODO:{label:'Todo',icon:'○',cls:'text-zinc-500'},
  IN_PROGRESS:{label:'In Progress',icon:'◐',cls:'text-amber-600'},
  REVIEW:{label:'Review',icon:'◑',cls:'text-blue-600'},
  DONE:{label:'Done',icon:'✓',cls:'text-emerald-600'},
  BLOCKED:{label:'Blocked',icon:'✕',cls:'text-red-600'},
  CANCELLED:{label:'Cancelled',icon:'—',cls:'text-zinc-400'},
}

export const PRIORITY_META = {
  LOW:{label:'Low', color:'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'},
  MEDIUM:{label:'Medium', color:'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'},
  HIGH:{label:'High', color:'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'},
  URGENT:{label:'Urgent', color:'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'},
}

export function languageColor(lang:string){ return LANGUAGE_COLORS[lang] ?? '#888' }
