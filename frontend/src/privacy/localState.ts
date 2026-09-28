import type { LocalCredential } from '../types'

const STORAGE_KEY = 'lumen-commons:resident:v1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function newHolderSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

export class LocalCredentialStore {
  constructor(private readonly storage: StorageLike = window.localStorage) {}

  load(): LocalCredential | null {
    const value = this.storage.getItem(STORAGE_KEY)
    if (!value) return null
    try {
      const parsed = JSON.parse(value) as LocalCredential
      if (!parsed.holderSecret || !parsed.district || !Number.isFinite(parsed.age)) return null
      return parsed
    } catch {
      return null
    }
  }

  save(input: Omit<LocalCredential, 'holderSecret' | 'savedAt'>): LocalCredential {
    const previous = this.load()
    const credential: LocalCredential = {
      ...input,
      holderSecret: previous?.holderSecret ?? newHolderSecret(),
      savedAt: new Date().toISOString(),
    }
    this.storage.setItem(STORAGE_KEY, JSON.stringify(credential))
    return credential
  }

  rotate(input?: Partial<Pick<LocalCredential, 'district' | 'age' | 'privateNote'>>): LocalCredential {
    const previous = this.load()
    if (!previous) throw new Error('No local credential to rotate')
    const credential: LocalCredential = {
      ...previous,
      ...input,
      holderSecret: newHolderSecret(),
      savedAt: new Date().toISOString(),
    }
    this.storage.setItem(STORAGE_KEY, JSON.stringify(credential))
    return credential
  }

  clear(): void {
    this.storage.removeItem(STORAGE_KEY)
  }
}

export { STORAGE_KEY }

