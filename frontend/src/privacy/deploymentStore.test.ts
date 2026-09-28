import { describe, expect, it } from 'vitest'
import { DeploymentStore } from './deploymentStore'

class MemoryStorage {
  value = new Map<string, string>()
  getItem(key: string) { return this.value.get(key) ?? null }
  setItem(key: string, value: string) { this.value.set(key, value) }
  removeItem(key: string) { this.value.delete(key) }
}

describe('DeploymentStore', () => {
  it('retains a deployment by wallet provider and network', () => {
    const store = new DeploymentStore(new MemoryStorage())
    store.save({
      contract_address: 'a'.repeat(64),
      deployment_transaction_hash: 'b'.repeat(64),
      network: 'preview',
      wallet_provider_id: 'wallet-1',
      deployed_at: '2026-09-28T00:00:00.000Z',
    })

    expect(store.load('preview', 'wallet-1')).toMatchObject({
      contract_address: 'a'.repeat(64),
      deployment_transaction_hash: 'b'.repeat(64),
    })
    expect(store.load('preprod', 'wallet-1')).toBeNull()
  })

  it('does not return malformed retained data', () => {
    const storage = new MemoryStorage()
    storage.setItem('lumen-commons:deployments:v1', JSON.stringify({ 'preview:wallet-1': { contract_address: 'bad' } }))
    expect(new DeploymentStore(storage).load('preview', 'wallet-1')).toBeNull()
  })
})
