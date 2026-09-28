import { describe, it, expect } from 'vitest'
import { computeHealth, healthLabelRu } from '../health'
import type { Project, Task } from '../types'

function mkProject(over: Partial<Project> = {}): Project {
  return {
    id:'p1', code:'WEB-001', name:'Test', description:'', type:'WEB', status:'ACTIVE',
    local_path:'~/Test', progress: 50, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    languages: [], technologies: [], last_commit: new Date().toISOString(), ...over
  } as Project
}

describe('computeHealth', ()=>{
  it('high for fresh active', ()=>{
    const p = mkProject({ updated_at: new Date().toISOString(), last_commit: new Date().toISOString() })
    const tasks = [{status:'DONE'} as Task, {status:'DONE'} as Task] as Task[]
    const h = computeHealth(p, tasks)
    expect(h.score).toBeGreaterThan(60)
    expect(h.labelKey).toBeDefined()
    expect(healthLabelRu(h.labelKey)).toBeTruthy()
  })
  it('low for blocked stale', ()=>{
    const old = new Date(Date.now()- 30*86400000).toISOString()
    const p = mkProject({ updated_at: old, last_commit: old })
    const tasks = [{status:'BLOCKED'} as Task, {status:'BLOCKED'} as Task, {status:'TODO'} as Task] as Task[]
    const h = computeHealth(p, tasks)
    expect(h.score).toBeLessThan(40)
    expect(h.labelKey).toBe('critical')
    expect(healthLabelRu(h.labelKey)).toBe('Критично')
  })
  it('never NaN on invalid dates', ()=>{
    const p = mkProject({ updated_at: 'foo', last_commit: 'bar' })
    const h = computeHealth(p, [{status:'TODO'} as Task])
    expect(Number.isFinite(h.score)).toBe(true)
  })
})
