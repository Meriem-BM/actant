'use client'

import { createPublicClient, http } from 'viem'
import { baseSepolia, base } from 'viem/chains'

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532)
export const RPC_URL  = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://sepolia.base.org'

export const REGISTRY_ADDRESS =
  (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? '') as `0x${string}`
export const FACTORY_ADDRESS =
  (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? '') as `0x${string}`

export const USDC_ADDRESS: `0x${string}` =
  CHAIN_ID === 8453
    ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    : '0x036CbD53842c5426634e7929541eC2318f3dCF7e'

export const CHAIN_NAME = CHAIN_ID === 8453 ? 'Base Mainnet' : 'Base Sepolia'
export const EXPLORER   = CHAIN_ID === 8453
  ? 'https://basescan.org'
  : 'https://sepolia.basescan.org'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPublicClient(): any {
  if (!_client) {
    _client = createPublicClient({
      chain: CHAIN_ID === 8453 ? base : baseSepolia,
      transport: http(RPC_URL),
    })
  }
  return _client
}

export function txUrl(hash: string) {
  return `${EXPLORER}/tx/${hash}`
}

export function addrUrl(address: string) {
  return `${EXPLORER}/address/${address}`
}
