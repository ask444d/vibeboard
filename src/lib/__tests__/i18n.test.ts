import { describe, it, expect } from 'vitest'
import { getCoverage, getTotalKeys, getAllLocales, parseLocaleFile, setCustomLocales, t } from '../i18n'
import { useStore } from '../../store/useStore'

describe('i18n coverage', ()=>{
  it('100% for en/ru', ()=>{
    expect(getCoverage('en')).toBe(100)
    expect(getCoverage('ru')).toBe(100)
    expect(getTotalKeys()).toBeGreaterThan(100)
  })
  it('100% for built-in de/fr/es/zh', ()=>{
    for(const code of ['de','fr','es','zh']){
      expect(getCoverage(code)).toBe(100)
    }
  })
  it('all built-ins listed', ()=>{
    const codes = getAllLocales().map(l=>l.code)
    for(const code of ['en','ru','de','fr','es','zh']){
      expect(codes).toContain(code)
    }
  })
})

describe('parseLocaleFile', ()=>{
  const goodDict = Object.fromEntries(
    Array.from({length: 12}, (_,i)=> [`k${i}`, `v${i}`])
  )
  // подменяем ключи на реальные, чтобы пройти фильтр известных ключей
  const realKeys = ['sidebar.overview','sidebar.projects','sidebar.tasks','sidebar.sessions','sidebar.ideas','sidebar.activity','sidebar.settings','sidebar.integrations','common.add','common.cancel','common.save','common.delete']

  it('rejects garbage', ()=>{
    expect(parseLocaleFile(null).ok).toBe(false)
    expect(parseLocaleFile([]).ok).toBe(false)
    expect(parseLocaleFile('str').ok).toBe(false)
    expect(parseLocaleFile({}).ok).toBe(false)
  })
  it('rejects bad code', ()=>{
    expect(parseLocaleFile({code:'', dict:{}})).toEqual({ok:false, error:'bad-code'})
    expect(parseLocaleFile({code:'ENGLISHtoolong', dict:{}})).toEqual({ok:false, error:'bad-code'})
    expect(parseLocaleFile({code:'pt!', dict:{}})).toEqual({ok:false, error:'bad-code'})
  })
  it('rejects builtin codes', ()=>{
    expect(parseLocaleFile({code:'en', dict:{a:'b'}})).toEqual({ok:false, error:'code-taken'})
    expect(parseLocaleFile({code:'DE', dict:{a:'b'}})).toEqual({ok:false, error:'code-taken'})
  })
  it('rejects too-few keys', ()=>{
    expect(parseLocaleFile({code:'pt', dict:{'sidebar.overview':'Visão'}})).toEqual({ok:false, error:'too-few'})
  })
  it('accepts valid file, keeps only known keys', ()=>{
    void goodDict
    const dict: Record<string,string> = {}
    for(const k of realKeys) dict[k] = `T-${k}`
    const res = parseLocaleFile({code:'pt', label:'Português', flag:'🇵🇹', dict:{...dict, 'nope.unknown':'x', 'empty':'  '}})
    expect(res.ok).toBe(true)
    if(res.ok){
      expect(res.value.code).toBe('pt')
      expect(res.value.label).toBe('Português')
      expect(Object.keys(res.value.dict)).toHaveLength(realKeys.length)
    }
  })
  it('defaults label and flag', ()=>{
    const dict: Record<string,string> = {}
    for(const k of realKeys) dict[k] = k
    const res = parseLocaleFile({code:'pt-br', dict})
    expect(res.ok).toBe(true)
    if(res.ok){
      expect(res.value.label).toBe('PT-BR')
      expect(res.value.flag).toBe('🌐')
    }
  })
})

describe('custom locales in store', ()=>{
  const realKeys = ['sidebar.overview','sidebar.projects','sidebar.tasks','sidebar.sessions','sidebar.ideas','sidebar.activity','sidebar.settings','sidebar.integrations','common.add','common.cancel','common.save','common.delete']
  const json = JSON.stringify({
    code:'pt', label:'Português', flag:'🇵🇹',
    dict: Object.fromEntries(realKeys.map(k=> [k, `T-${k}`])),
  })

  it('imports, syncs registry, updates, removes with locale fallback', ()=>{
    const st = useStore.getState()
    const res = st.importCustomLocale(json)
    expect(res.ok).toBe(true)
    if(!res.ok) return
    expect(res.code).toBe('pt')
    expect(res.updated).toBe(false)
    expect(t('pt','sidebar.overview')).toBe('T-sidebar.overview')
    st.setLocale('pt')
    expect(useStore.getState().locale).toBe('pt')
    // повторный импорт того же кода — обновление
    const res2 = useStore.getState().importCustomLocale(json)
    expect(res2.ok && res2.updated).toBe(true)
    // удаление сбрасывает активную локаль на en
    useStore.getState().removeCustomLocale('pt')
    expect(useStore.getState().customLocales).toHaveLength(0)
    expect(useStore.getState().locale).toBe('en')
    expect(t('pt','sidebar.overview')).toBe('Overview')
  })

  it('rejects bad json in store action', ()=>{
    expect(useStore.getState().importCustomLocale('nope').ok).toBe(false)
  })

  it('exports a valid template', ()=>{
    const tpl = JSON.parse(useStore.getState().exportLocaleTemplate())
    expect(typeof tpl.dict).toBe('object')
    expect(Object.keys(tpl.dict).length).toBeGreaterThan(100)
  })
})

describe('custom locale registry', ()=>{
  it('registers, resolves with en fallback, unregisters', ()=>{
    setCustomLocales([{code:'pt', label:'Português', flag:'🇵🇹', dict:{'sidebar.overview':'Visão','sidebar.projects':'Projetos'}}])
    expect(getAllLocales().some(l=> l.code==='pt' && l.custom)).toBe(true)
    expect(t('pt','sidebar.overview')).toBe('Visão')
    expect(t('pt','sidebar.tasks')).toBe('Tasks') // fallback to en for missing keys
    expect(getCoverage('pt')).toBeGreaterThan(0)
    setCustomLocales([])
    expect(getAllLocales().some(l=> l.code==='pt')).toBe(false)
    expect(t('pt','sidebar.overview')).toBe('Overview')
  })
})
