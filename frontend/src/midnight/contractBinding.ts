import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js'
import type { WitnessContext } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime'
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime'
import {
  Binding,
  FinalizedTransaction,
  Proof,
  SignatureEnabled,
  Transaction,
  type TransactionId,
} from '@midnight-ntwrk/midnight-js-protocol/ledger'
import { deployContract, findDeployedContract, type FoundContract } from '@midnight-ntwrk/midnight-js-contracts'
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider'
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider'
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id'
import { createProofProvider, type MidnightProviders, type PrivateStateProvider, type UnboundTransaction } from '@midnight-ntwrk/midnight-js-types'
import * as Generated from '../../../contract/managed/lumen-commons/contract/index.js'
import type { ContractDeployment, LocalCredential, Network } from '../types'
import type { ConnectedWalletApi, WalletConfiguration } from '../wallet/connector'

type LumenPrivateState = {
  district: bigint
  age: bigint
  holderSecret: Uint8Array
  adminSecret: Uint8Array
}

type LumenContract = Generated.Contract<LumenPrivateState, Generated.Witnesses<LumenPrivateState>>
type CircuitKey = Exclude<keyof LumenContract['impureCircuits'], number | symbol>
type PrivateStateId = 'lumenResident'

const PRIVATE_STATE_ID: PrivateStateId = 'lumenResident'
const PRIVATE_STATE_STORAGE_PREFIX = 'lumen-commons:contract-private:v1'
const CAMPAIGN_LABEL = 'lumen-commons:harbor-park-2026:v1'

const witnesses: Generated.Witnesses<LumenPrivateState> = {
  localResidentCredential: ({ privateState }: WitnessContext<Generated.Ledger, LumenPrivateState>) => [
    privateState,
    { district: privateState.district, age: privateState.age, holderSecret: privateState.holderSecret },
  ],
  localAdminSecret: ({ privateState }: WitnessContext<Generated.Ledger, LumenPrivateState>) => [
    privateState,
    privateState.adminSecret,
  ],
}

const compiledContract = CompiledContract.make<LumenContract>('LumenCommons', Generated.Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets('.'),
)

type PersistedPrivateState = {
  district: string
  age: string
  holderSecret: string
  adminSecret: string
}

type PersistedContractSecrets = {
  states: Record<string, PersistedPrivateState>
  signingKeys: Record<string, string>
}

function emptySecrets(): PersistedContractSecrets {
  return { states: {}, signingKeys: {} }
}

function serializeState(value: LumenPrivateState): PersistedPrivateState {
  return {
    district: value.district.toString(),
    age: value.age.toString(),
    holderSecret: toHex(value.holderSecret),
    adminSecret: toHex(value.adminSecret),
  }
}

function deserializeState(value: PersistedPrivateState): LumenPrivateState {
  return {
    district: BigInt(value.district),
    age: BigInt(value.age),
    holderSecret: fromHex(value.holderSecret),
    adminSecret: fromHex(value.adminSecret),
  }
}

class BrowserPrivateStateProvider implements PrivateStateProvider<PrivateStateId, LumenPrivateState> {
  private contractAddress = ''
  private readonly storageKey: string

  constructor(private readonly initialState: LumenPrivateState, network: Network) {
    this.storageKey = `${PRIVATE_STATE_STORAGE_PREFIX}:${network}`
  }

  setContractAddress(address: string): void {
    this.contractAddress = address
  }

  async set(_id: PrivateStateId, value: LumenPrivateState): Promise<void> {
    this.requireContractAddress()
    const data = this.read()
    data.states[this.contractAddress] = serializeState(value)
    this.write(data)
  }

  async get(id: PrivateStateId): Promise<LumenPrivateState | null> {
    void id
    this.requireContractAddress()
    const stored = this.read().states[this.contractAddress]
    return stored ? deserializeState(stored) : this.initialState
  }

  async remove(id: PrivateStateId): Promise<void> {
    void id
    this.requireContractAddress()
    const data = this.read()
    delete data.states[this.contractAddress]
    this.write(data)
  }

  async clear(): Promise<void> {
    const data = this.read()
    data.states = {}
    this.write(data)
  }

  async setSigningKey(address: string, key: string): Promise<void> {
    const data = this.read()
    data.signingKeys[address] = key
    this.write(data)
  }

  async getSigningKey(address: string): Promise<string | null> {
    return this.read().signingKeys[address] ?? null
  }

  async removeSigningKey(address: string): Promise<void> {
    const data = this.read()
    delete data.signingKeys[address]
    this.write(data)
  }

  async clearSigningKeys(): Promise<void> {
    const data = this.read()
    data.signingKeys = {}
    this.write(data)
  }

  exportPrivateStates(): Promise<never> {
    return Promise.reject(new Error('Private contract state export is not enabled in this browser flow'))
  }

  importPrivateStates(): Promise<never> {
    return Promise.reject(new Error('Private contract state import is not enabled in this browser flow'))
  }

  exportSigningKeys(): Promise<never> {
    return Promise.reject(new Error('Contract maintenance keys remain on this device'))
  }

  importSigningKeys(): Promise<never> {
    return Promise.reject(new Error('Contract maintenance key import is not enabled'))
  }

  private requireContractAddress(): void {
    if (!this.contractAddress) throw new Error('Contract address is not set for local private state')
  }

  private read(): PersistedContractSecrets {
    try {
      const raw = window.localStorage.getItem(this.storageKey)
      if (!raw) return emptySecrets()
      const parsed = JSON.parse(raw) as Partial<PersistedContractSecrets>
      return {
        states: parsed.states && typeof parsed.states === 'object' ? parsed.states : {},
        signingKeys: parsed.signingKeys && typeof parsed.signingKeys === 'object' ? parsed.signingKeys : {},
      }
    } catch {
      return emptySecrets()
    }
  }

  private write(value: PersistedContractSecrets): void {
    window.localStorage.setItem(this.storageKey, JSON.stringify(value))
  }
}

function toResidentState(value: LocalCredential, adminSecret = new Uint8Array(32)): LumenPrivateState {
  return {
    district: BigInt(value.district === 'North Harbor' ? 7 : 0),
    age: BigInt(value.age),
    holderSecret: fromHex(value.holderSecret),
    adminSecret,
  }
}

function randomBytes32(): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(32))
  crypto.getRandomValues(bytes)
  return bytes
}

async function campaignId(): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(CAMPAIGN_LABEL)
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoded))
}

function artifactUrl(): string {
  const root = import.meta.env.VITE_MIDNIGHT_ARTIFACT_BASE_URL || '/contract-artifacts'
  return new URL(`${root.replace(/\/$/, '')}/lumen-commons/`, window.location.origin).toString()
}

async function createProviders(input: {
  network: Network
  walletApi: ConnectedWalletApi
  walletConfiguration: WalletConfiguration
  privateState: LumenPrivateState
}): Promise<MidnightProviders<CircuitKey, PrivateStateId, LumenPrivateState>> {
  setNetworkId(input.network)
  const keyMaterialProvider = new FetchZkConfigProvider<CircuitKey>(artifactUrl(), window.fetch.bind(window))
  const shielded = await input.walletApi.getShieldedAddresses()
  const provingProvider = await input.walletApi.getProvingProvider(keyMaterialProvider)
  const proofProvider = provingProvider
    ? createProofProvider(provingProvider)
    : httpClientProofProvider(input.walletConfiguration.proverServerUri ?? 'http://localhost:6300', keyMaterialProvider)

  return {
    privateStateProvider: new BrowserPrivateStateProvider(input.privateState, input.network),
    zkConfigProvider: keyMaterialProvider,
    proofProvider,
    publicDataProvider: indexerPublicDataProvider(
      input.walletConfiguration.indexerUri,
      input.walletConfiguration.indexerWsUri,
      window.WebSocket,
    ),
    walletProvider: {
      getCoinPublicKey: () => shielded.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shielded.shieldedEncryptionPublicKey,
      balanceTx: async (tx: UnboundTransaction): Promise<FinalizedTransaction> => {
        const received = await input.walletApi.balanceUnsealedTransaction(toHex(tx.serialize()))
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
          'signature', 'proof', 'binding', fromHex(received.tx),
        )
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        await input.walletApi.submitTransaction(toHex(tx.serialize()))
        const [transactionId] = tx.identifiers()
        if (!transactionId) throw new Error('The wallet returned no transaction identifier')
        return transactionId
      },
    },
  }
}

export async function deployLumenCommons(input: {
  network: Network
  walletProviderId: string
  walletApi: ConnectedWalletApi
  walletConfiguration: WalletConfiguration
  privateState: LocalCredential
}): Promise<ContractDeployment> {
  const adminSecret = randomBytes32()
  const state = toResidentState(input.privateState, adminSecret)
  const providers = await createProviders({ ...input, privateState: state })
  const adminCommitment = Generated.pureCircuits.deriveAdminCommitment(adminSecret)
  const deployed = await deployContract(providers, {
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: state,
    args: [await campaignId(), 7n, 16n, adminCommitment],
  })
  const { contractAddress, txHash, blockTimestamp } = deployed.deployTxData.public
  const milliseconds = blockTimestamp < 1_000_000_000_000 ? blockTimestamp * 1000 : blockTimestamp
  return {
    contract_address: String(contractAddress),
    deployment_transaction_hash: String(txHash),
    network: input.network,
    wallet_provider_id: input.walletProviderId,
    deployed_at: new Date(milliseconds).toISOString(),
  }
}

export async function connectLumenCommons(input: {
  contractAddress: string
  network: Network
  walletApi: ConnectedWalletApi
  walletConfiguration: WalletConfiguration
  privateState: LocalCredential
}): Promise<FoundContract<LumenContract>> {
  const state = toResidentState(input.privateState)
  const providers = await createProviders({ ...input, privateState: state })
  providers.privateStateProvider.setContractAddress(input.contractAddress)
  const existing = await providers.privateStateProvider.get(PRIVATE_STATE_ID)
  const activeState = existing ? { ...state, adminSecret: existing.adminSecret } : state
  return findDeployedContract<LumenContract>(providers, {
    contractAddress: input.contractAddress,
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: activeState,
  })
}
