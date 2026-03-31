import type { AgentManifest } from './agent'
import type { Address, Hex } from './primitives'

export interface WalletConfig {
  name: string
  chainId?: number
  spendingLimit?: {
    daily?: string
    perTx?: string
  }
  allowedRecipients?: Address[]
}

export interface CreateWalletResponse {
  walletAddress: Address
  agentId: Hex
  txHash: Hex
  manifest: AgentManifest
}

export interface PaymentRequest {
  to: Address | string
  amount: string
  currency: 'USDC'
  memo?: string
}

export interface PaymentResponse {
  hash: Hex
  status: 'pending' | 'confirmed'
  amount: string
  to: Address
  timestamp: Date
  logHash: Hex
}

export interface Transaction {
  hash: Hex
  agentId: string
  from: Address
  to: Address
  amount: string
  currency: 'USDC'
  memo?: string
  status: 'pending' | 'confirmed' | 'failed'
  blockNumber?: number
  timestamp: Date
  logHash?: Hex
}
