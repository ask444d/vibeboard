import { describe, it, expect, beforeEach } from 'vitest'
import { hybridStorage } from '../sqliteStore'

// NOTE: jsdom has no Tauri globals, so isTauri() is false here and
// hybridStorage must behave exactly like localStorage.
describe('hybridStorage (browser fallback)', ()=>{
  beforeEach(()=>{ localStorage.clear() })

  it('roundtrips values through localStorage', async ()=>{
    await hybridStorage.setItem('k1', '{"a":1}')
    expect(await hybridStorage.getItem('k1')).toBe('{"a":1}')
    expect(localStorage.getItem('k1')).toBe('{"a":1}')
  })

  it('returns null for missing keys', async ()=>{
    expect(await hybridStorage.getItem('missing')).toBeNull()
  })

  it('removes keys', async ()=>{
    await hybridStorage.setItem('k2', 'v')
    await hybridStorage.removeItem('k2')
    expect(await hybridStorage.getItem('k2')).toBeNull()
  })
})
