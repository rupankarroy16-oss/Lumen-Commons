import { describe, expect, it, vi } from 'vitest'
import { classifyWalletError, connectWallet, discoverWallets, type DiscoveredWallet } from './connector'

const uuid1 = '550e8400-e29b-41d4-a716-446655440000'
const uuid2 = '123e4567-e89b-42d3-a456-426614174000'

describe('wallet connector', () => {
  it('discovers only UUID-keyed 1AM DApp Connector v4 providers', () => {
    const connect = vi.fn()
    window.midnight = {
      ignored: { name: 'Spoof', rdns: 'test.spoof', icon: '', apiVersion: '4.0.1', connect },
      [uuid1]: { name: 'Lace Midnight', rdns: 'io.lace.midnight', icon: '', apiVersion: '4.0.1', connect },
      [uuid2]: { name: '1AM Wallet', rdns: 'xyz.1am.wallet', icon: '', apiVersion: '4.0.1', connect },
    }
    const wallets = discoverWallets()
    expect(wallets).toHaveLength(1)
    expect(wallets[0]).toMatchObject({ id: uuid2, name: '1AM Wallet' })
  })

  it('does not expose Lace when 1AM is unavailable', () => {
    const connect = vi.fn()
    window.midnight = {
      [uuid1]: { name: 'Lace Midnight', rdns: 'io.lace.midnight', icon: '', apiVersion: '4.0.1', connect },
    }
    expect(discoverWallets()).toEqual([])
  })

  it('rejects a wallet network mismatch', async () => {
    const wallet = {
      id: uuid1, name: '1AM', rdns: 'xyz.1am.wallet', icon: '', apiVersion: '4.0.1',
      connect: vi.fn().mockResolvedValue({
        getConfiguration: vi.fn().mockResolvedValue({ networkId: 'preprod' }),
        getDustBalance: vi.fn().mockResolvedValue({ balance: 10n, cap: 20n }),
      }),
    } satisfies DiscoveredWallet
    await expect(connectWallet(wallet, 'preview')).rejects.toThrow('Network mismatch')
  })

  it('reads DUST after connecting to the requested network', async () => {
    const wallet = {
      id: uuid1, name: '1AM', rdns: 'xyz.1am.wallet', icon: '', apiVersion: '4.0.1',
      connect: vi.fn().mockResolvedValue({
        getConfiguration: vi.fn().mockResolvedValue({ networkId: 'preview' }),
        getDustBalance: vi.fn().mockResolvedValue({ balance: 42n, cap: 84n }),
      }),
    } satisfies DiscoveredWallet
    expect((await connectWallet(wallet, 'preview')).dust).toBe(42n)
  })

  it('classifies wallet errors into actionable states', () => {
    expect(classifyWalletError(new Error('Permission rejected'))).toBe('rejected')
    expect(classifyWalletError(new Error('insufficient DUST'))).toBe('insufficient-dust')
    expect(classifyWalletError(new Error('proof server offline'))).toBe('proving-service')
    expect(classifyWalletError(new Error('indexer subscription failed'))).toBe('indexer')
  })
})
