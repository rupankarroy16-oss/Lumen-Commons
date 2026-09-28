import type { ConnectedWalletApi, WalletConfiguration } from '../wallet/connector'
import type { Category, LocalCredential, Network, PublicReceipt } from '../types'

export type ProofPhase = 0 | 1 | 2 | 3

export class ContractNotConfiguredError extends Error {}

const categories: Record<Category, 0 | 1 | 2> = { support: 0, unsure: 1, concern: 2 }

export async function submitResponseCircuit(input: {
  category: Category
  network: Network
  walletApi: ConnectedWalletApi
  walletConfiguration: WalletConfiguration
  privateState: LocalCredential
  contractAddress: string
  onPhase: (phase: ProofPhase) => void
}): Promise<PublicReceipt> {
  if (!input.contractAddress) {
    throw new ContractNotConfiguredError(
      'Deploy your Midnight contract from this browser before generating a response proof.',
    )
  }

  input.onPhase(0)
  if (input.walletConfiguration.networkId.toLowerCase() !== input.network) {
    throw new Error('Wallet network changed before proving')
  }

  input.onPhase(1)
  const { connectLumenCommons } = await import('./contractBinding')
  const contract = await connectLumenCommons({
    contractAddress: input.contractAddress,
    network: input.network,
    walletApi: input.walletApi,
    walletConfiguration: input.walletConfiguration,
    privateState: input.privateState,
  })
  input.onPhase(2)
  const result = await contract.callTx.submitResponse(categories[input.category])
  input.onPhase(3)
  const transactionId = String(result.public.txHash)
  const timestamp = result.public.blockTimestamp
  const finalizedAt = new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp).toISOString()
  return {
    campaign_public_id: 'harbor-park-2026',
    contract_address: input.contractAddress,
    transaction_id: transactionId,
    network: input.network,
    outcome: input.category,
    disclosure_scope: ['campaign_id', 'eligibility_satisfied', 'response_category'],
    finalized_at: finalizedAt,
  }
}
