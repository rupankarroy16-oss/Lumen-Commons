import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Network } from '../types'
import {
  classifyWalletError,
  connectWallet,
  discoverWallets,
  type ConnectedWalletApi,
  type DiscoveredWallet,
  type WalletConfiguration,
  type WalletErrorKind,
} from './connector'

export function useWallet(network: Network) {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([])
  const [api, setApi] = useState<ConnectedWalletApi | null>(null)
  const [configuration, setConfiguration] = useState<WalletConfiguration | null>(null)
  const [walletId, setWalletId] = useState<string | null>(null)
  const [dust, setDust] = useState<bigint | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<WalletErrorKind | null>(null)

  const refresh = useCallback(() => setWallets(discoverWallets()), [])
  useEffect(() => {
    refresh()
    window.addEventListener('midnight#ready', refresh)
    return () => window.removeEventListener('midnight#ready', refresh)
  }, [refresh])

  const disconnect = useCallback(() => {
    setApi(null)
    setConfiguration(null)
    setWalletId(null)
    setDust(null)
    setError(null)
  }, [])

  useEffect(() => { disconnect() }, [network, disconnect])

  const connect = useCallback(async (wallet = wallets[0]) => {
    if (!wallet) { setError('unknown'); return false }
    setConnecting(true)
    setError(null)
    try {
      const connected = await connectWallet(wallet, network)
      setApi(connected.api)
      setConfiguration(connected.configuration)
      setWalletId(wallet.rdns || wallet.id)
      setDust(connected.dust)
      return true
    } catch (reason) {
      setError(classifyWalletError(reason))
      return false
    } finally {
      setConnecting(false)
    }
  }, [network, wallets])

  return useMemo(() => ({ wallets, api, configuration, walletId, dust, connecting, error, connect, disconnect, refresh }), [wallets, api, configuration, walletId, dust, connecting, error, connect, disconnect, refresh])
}
