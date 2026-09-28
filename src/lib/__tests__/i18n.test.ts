import { describe, it, expect } from 'vitest'
import { getCoverage, getTotalKeys } from '../i18n'

describe('i18n coverage', ()=>{
  it('100% for en/ru', ()=>{
    expect(getCoverage('en')).toBe(100)
    expect(getCoverage('ru')).toBe(100)
    expect(getTotalKeys()).toBeGreaterThan(100)
  })
})
