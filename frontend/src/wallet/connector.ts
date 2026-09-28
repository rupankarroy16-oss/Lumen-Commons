import type { ConnectedAPI, Configuration, InitialAPI } from '@midnight-ntwrk/dapp-connector-api'
import type { Network } from '../types'

export type WalletConfiguration = Configuration
export type ConnectedWalletApi = ConnectedAPI

export type InitialWalletApi = InitialAPI

export interface DiscoveredWallet extends InitialWalletApi {
  id: string
  preferred: boolean
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function discoverWallets(target: Window = window): DiscoveredWallet[] {
  const registry = target.midnight ?? {}
  return Object.entries(registry)
    .filter(([id, api]) => UUID_V4.test(id) && api && typeof api.connect === 'function')
    .map(([id, api]) => ({
      ...api,
      id,
      preferred: /(?:^|\.)1am(?:\.|$)/i.test(api.rdns ?? '') || /1am/i.test(api.name),
    }))
    .sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.name.localeCompare(b.name))
}

export type WalletErrorKind = 'rejected' | 'insufficient-dust' | 'proving-service' | 'indexer' | 'network' | 'unknown'

export function classifyWalletError(error: unknown): WalletErrorKind {
  const message = error instanceof Error ? error.message : String(error)
  if (/reject|denied|permission/i.test(message)) return 'rejected'
  if (/dust|insufficient|balance/i.test(message)) return 'insufficient-dust'
  if (/proof|prover|proving/i.test(message)) return 'proving-service'
  if (/indexer|graphql|subscription/i.test(message)) return 'indexer'
  if (/network|preview|preprod|mismatch/i.test(message)) return 'network'
  return 'unknown'
}

export async function connectWallet(
  wallet: DiscoveredWallet,
  network: Network,
): Promise<{ api: ConnectedWalletApi; configuration: WalletConfiguration; dust: bigint }> {
  const api = await wallet.connect(network)
  await api.hintUsage?.(['getConfiguration', 'getDustBalance', 'getProvingProvider', 'submitTransaction'])
  const configuration = await api.getConfiguration()
  if (configuration.networkId.toLowerCase() !== network) {
    throw new Error(`Network mismatch: wallet connected to ${configuration.networkId}`)
  }
  const dust = await api.getDustBalance()
  return { api, configuration, dust: dust.balance }
}
