import { describe, expect, it } from 'vitest'
import { LocalCredentialStore, newHolderSecret } from './localState'

class MemoryStorage {
  value = new Map<string, string>()
  getItem(key: string) { return this.value.get(key) ?? null }
  setItem(key: string, value: string) { this.value.set(key, value) }
  removeItem(key: string) { this.value.delete(key) }
}

describe('LocalCredentialStore', () => {
  it('persists private state only in the selected local storage', () => {
    const store = new LocalCredentialStore(new MemoryStorage())
    store.save({ district: 'North Harbor', age: 34, privateNote: 'local only' })
    expect(store.load()).toMatchObject({ district: 'North Harbor', age: 34, privateNote: 'local only' })
  })

  it('preserves the holder secret when ordinary fields are replaced', () => {
    const store = new LocalCredentialStore(new MemoryStorage())
    const first = store.save({ district: 'North Harbor', age: 34, privateNote: '' })
    const second = store.save({ district: 'North Harbor', age: 35, privateNote: 'updated' })
    expect(second.holderSecret).toBe(first.holderSecret)
  })

  it('rotates the private holder secret on request', () => {
    const store = new LocalCredentialStore(new MemoryStorage())
    const first = store.save({ district: 'North Harbor', age: 34, privateNote: '' })
    const second = store.rotate()
    expect(second.holderSecret).not.toBe(first.holderSecret)
  })

  it('creates a 32-byte secret', () => expect(newHolderSecret()).toMatch(/^[a-f0-9]{64}$/))
})

