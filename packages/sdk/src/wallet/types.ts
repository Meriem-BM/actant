import type { Account, Chain, createPublicClient } from 'viem'
import type { AgentManifest, UserOperation } from '@actant/shared'

export type Hex = `0x${string}`
export type Address = `0x${string}`
export type Bytes32 = `0x${string}`
export type TxHash = `0x${string}`

type WalletClientFn = (...args: any[]) => Promise<Hex>

export interface WalletClientLike {
  writeContract: WalletClientFn
  sendTransaction: WalletClientFn
  signMessage?: WalletClientFn
}

export interface ActantClientConfig {
  account: Account
  chainId?: number
  rpcUrl?: string
  factory: Address
  registry: Address
  bundlerUrl?: string
  externalWalletClient?: WalletClientLike
}

export type WalletInit = {
  walletAddress: Address
  agentId: Bytes32
  manifest: AgentManifest
  publicClient: ReturnType<typeof createPublicClient>
  walletClient: WalletClientLike
  usdcAddress: Address
  registryAddr: Address
  chain: Chain
  account: Account
  chainId: number
  bundlerUrl?: string
}

export type ClientContext = {
  chainId: number
  chain: Chain
  publicClient: ReturnType<typeof createPublicClient>
  walletClient: WalletClientLike
  usdcAddress: Address
}

export type PaymentInput = {
  to: Address
  amount: bigint
  amountRaw: string
  memo: string
}

export type PaymentSentLog = {
  topics: readonly Hex[]
  data: Hex
}

export type UserOpGasFields = Pick<
  UserOperation,
  'callGasLimit' | 'verificationGasLimit' | 'preVerificationGas'
>
