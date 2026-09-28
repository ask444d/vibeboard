import { describe, it, expect } from 'vitest'
import { generateProjectCode, calcProgress, analyzeLanguages } from '../utils'
import type { Project, Task } from '../types'

describe('generateProjectCode', ()=>{
  it('generates WEB-001 for empty', ()=>{
    expect(generateProjectCode('WEB', [])).toBe('WEB-001')
  })
  it('increments', ()=>{
    const existing = [{code:'WEB-001'} as Project, {code:'WEB-002'} as Project]
    expect(generateProjectCode('WEB', existing)).toBe('WEB-003')
  })
  it('per type', ()=>{
    const existing = [{code:'APP-001'} as Project]
    expect(generateProjectCode('WEB', existing)).toBe('WEB-001')
  })
})

describe('calcProgress', ()=>{
  it('0 for no tasks', ()=> expect(calcProgress([])).toBe(0))
  it('75% for 3/4 done', ()=>{
    const tasks = [{status:'DONE'} as Task, {status:'DONE'} as Task, {status:'DONE'} as Task, {status:'TODO'} as Task]
    expect(calcProgress(tasks)).toBe(75)
  })
})

describe('analyzeLanguages', ()=>{
  it('calculates by bytes', ()=>{
    const files = [
      {path:'src/a.ts', bytes: 6000, ext:'ts'},
      {path:'src/b.ts', bytes: 4000, ext:'ts'},
      {path:'src/c.css', bytes: 2000, ext:'css'},
    ]
    const res = analyzeLanguages(files)
    expect(res.find(r=>r.language==='TypeScript')?.percentage).toBeGreaterThan(70)
    expect(res.find(r=>r.language==='CSS')?.percentage).toBeLessThan(30)
  })
  it('ignores node_modules', ()=>{
    const files = [
      {path:'node_modules/a.js', bytes: 10000, ext:'js'},
      {path:'src/a.ts', bytes: 1000, ext:'ts'},
    ]
    const res = analyzeLanguages(files)
    expect(res.length).toBe(1)
    expect(res[0].language).toBe('TypeScript')
  })
  it('ignores binary', ()=>{
    const files = [
      {path:'src/a.png', bytes: 5000, ext:'png'},
      {path:'src/b.ts', bytes: 1000, ext:'ts'},
    ]
    const res = analyzeLanguages(files)
    expect(res[0].language).toBe('TypeScript')
  })
})
