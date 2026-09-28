import type { ContractDeployment, Network } from '../types'
import type { StorageLike } from './localState'

export const DEPLOYMENT_STORAGE_KEY = 'lumen-commons:deployments:v1'

function recordKey(network: Network, walletProviderId: string): string {
  return `${network}:${walletProviderId}`
}

function isDeployment(value: unknown): value is ContractDeployment {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<ContractDeployment>
  return typeof item.contract_address === 'string'
    && item.contract_address.length >= 32
    && typeof item.deployment_transaction_hash === 'string'
    && item.deployment_transaction_hash.length >= 16
    && (item.network === 'preview' || item.network === 'preprod')
    && typeof item.wallet_provider_id === 'string'
    && typeof item.deployed_at === 'string'
}

export class DeploymentStore {
  constructor(private readonly storage: StorageLike = window.localStorage) {}

  load(network: Network, walletProviderId: string): ContractDeployment | null {
    const records = this.readAll()
    const value = records[recordKey(network, walletProviderId)]
    return isDeployment(value) ? value : null
  }

  save(value: ContractDeployment): ContractDeployment {
    const records = this.readAll()
    records[recordKey(value.network, value.wallet_provider_id)] = value
    this.storage.setItem(DEPLOYMENT_STORAGE_KEY, JSON.stringify(records))
    return value
  }

  remove(network: Network, walletProviderId: string): void {
    const records = this.readAll()
    delete records[recordKey(network, walletProviderId)]
    this.storage.setItem(DEPLOYMENT_STORAGE_KEY, JSON.stringify(records))
  }

  private readAll(): Record<string, unknown> {
    const raw = this.storage.getItem(DEPLOYMENT_STORAGE_KEY)
    if (!raw) return {}
    try {
      const value = JSON.parse(raw) as unknown
      return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {}
    } catch {
      return {}
    }
  }
}
