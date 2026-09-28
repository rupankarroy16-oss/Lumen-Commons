import type { ConnectedAPI, Configuration, InitialAPI } from '@midnight-ntwrk/dapp-connector-api'
import type { Network } from '../types'

export type WalletConfiguration = Configuration
export type ConnectedWalletApi = ConnectedAPI

export type InitialWalletApi = InitialAPI

export interface DiscoveredWallet extends InitialWalletApi {
  id: string
}

const ONE_AM_NAME = /(?:^|\s)1\s*am(?:\s+wallet)?(?:$|\s)/i
const ONE_AM_RDNS = /(?:^|[._-])(?:1am|oneam)(?:[._-]|$)/i

function isOneAmProvider(api: InitialWalletApi): boolean {
  return (
    api.apiVersion.split('.')[0] === '4'
    && (ONE_AM_NAME.test(api.name.trim()) || ONE_AM_RDNS.test(api.rdns ?? ''))
  )
}

export function discoverWallets(target: Window = window): DiscoveredWallet[] {
  const registry = target.midnight ?? {}
  return Object.entries(registry)
    .filter(
      ([, api]) => (
        api
        && typeof api.connect === 'function'
        && isOneAmProvider(api)
      ),
    )
    .map(([id, api]) => ({
      ...api,
      id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
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
