import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), '..', 'contract', 'lumen-commons.compact'), 'utf8')

describe('Compact privacy boundary', () => {
  it('contains private witnesses, two circuits, and replay protection', () => {
    expect(source).toContain('witness localResidentCredential')
    expect(source).toContain('export circuit submitResponse')
    expect(source).toContain('export circuit closeCampaign')
    expect(source).toContain('!usedNullifiers.member')
  })

  it('does not disclose exact credential fields', () => {
    expect(source).not.toMatch(/disclose\(credential\.(age|district|holderSecret)\)/)
  })
})

