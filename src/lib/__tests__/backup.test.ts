import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../../store/useStore'

beforeEach(()=>{ useStore.getState().clearAll() })

describe('project backup', ()=>{
  it('roundtrips project with tasks/ideas/notes', ()=>{
    const st = useStore.getState()
    const p = st.addProject({name:'BackupTest', type:'WEB', description:'d', status:'ACTIVE'})
    st.addTask({project_id:p.id, title:'T1', status:'TODO', priority:'HIGH'})
    st.addIdea(p.id, 'I1', 'desc', {tags:['a']})
    st.addNote(p.id, 'hello')
    const json = useStore.getState().exportProject(p.id)
    expect(json).toBeTruthy()
    useStore.getState().clearAll()
    const res = useStore.getState().importProject(json!)
    expect(res.ok).toBe(true)
    const s2 = useStore.getState()
    expect(s2.projects.length).toBe(1)
    expect(s2.projects[0].code).toBe(p.code)
    expect(s2.tasks.length).toBe(1)
    expect(s2.tasks[0].number).toBe(1)
    expect(s2.tasks[0].title).toBe('T1')
    expect(s2.ideas[0].tags).toEqual(['a'])
    expect(s2.notes.length).toBe(1)
  })
  it('rejects garbage', ()=>{
    expect(useStore.getState().importProject('not json').ok).toBe(false)
    expect(useStore.getState().importProject('{"foo":1}').ok).toBe(false)
  })
  it('regenerates code on collision', ()=>{
    const st = useStore.getState()
    const p = st.addProject({name:'A', type:'WEB', description:'', status:'ACTIVE'})
    const json = useStore.getState().exportProject(p.id)!
    const res = useStore.getState().importProject(json)
    expect(res.ok).toBe(true)
    expect(res.code).not.toBe(p.code)
    expect(useStore.getState().projects.length).toBe(2)
  })
})
