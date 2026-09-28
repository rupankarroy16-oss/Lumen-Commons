export type Network = 'preview' | 'preprod'
export type Category = 'support' | 'unsure' | 'concern'

export interface LocalCredential {
  district: string
  age: number
  holderSecret: string
  privateNote: string
  savedAt: string
}

export interface PublicReceipt {
  campaign_public_id: string
  contract_address: string
  transaction_id: string
  network: Network
  outcome: Category
  disclosure_scope: string[]
  finalized_at: string
}

export interface ContractDeployment {
  contract_address: string
  deployment_transaction_hash: string
  network: Network
  wallet_provider_id: string
  deployed_at: string
}

export interface DisclosurePlan {
  plain_language_requirement: string
  proof_steps: string[]
  remains_private: string[]
  becomes_public: string[]
  verifier_message: string
  ambiguity_flags: string[]
  used_fallback: boolean
  requirement_hash: string
}

export interface PublicMetrics {
  campaign_public_id: string
  finalized_proofs: number
  support_count: number
  unsure_count: number
  concern_count: number
}
