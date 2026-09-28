// Plugin API for VibeBoard — open source extensibility without forking.
// Good first issue: add a detector / language color via register* without touching core.

import { LANGUAGE_COLORS } from './constants'

export type TechDetector = { file: string; techs: string[] }

const detectors: TechDetector[] = []
const languageColors: Record<string,string> = { ...LANGUAGE_COLORS }
const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function registerTechDetector(det: TechDetector){
  if (!det || typeof det.file !== 'string' || !Array.isArray(det.techs)) return
  if (detectors.some(d=> d.file===det.file && d.techs.join('|')===det.techs.join('|'))) return // dedupe (HMR-safe)
  detectors.push({ file: det.file, techs: det.techs.filter(t=> typeof t === 'string').slice(0,8) })
}

export function registerLanguageColor(lang:string, color:string){
  if (typeof lang !== 'string' || !HEX_RE.test(color)) return // защита от CSS-инъекций
  languageColors[lang]=color
}

export function getExtraDetectors(): TechDetector[] { return [...detectors] }
export function getLanguageColorExt(lang:string): string | undefined { return languageColors[lang] }

// Встроенные extras — регистрируются один раз (HMR-safe благодаря dedupe)
registerTechDetector({ file: 'deno.json', techs: ['Deno'] })
registerTechDetector({ file: 'bun.lockb', techs: ['Bun'] })
registerTechDetector({ file: 'turbo.json', techs: ['Turborepo'] })
