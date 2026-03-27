// Shared types for AgentPay

export interface Agent {
  id: string
  name: string
  walletAddress: string
  createdAt: Date
  status: 'active' | 'paused' | 'suspended'
}

export interface Transaction {
  hash: string
  from: string
  to: string
  amount: string
  currency: 'USDC'
  memo?: string
  status: 'pending' | 'confirmed' | 'failed'
  blockNumber?: number
  timestamp: Date
}

export interface WalletConfig {
  name: string
  spendingLimit?: {
    daily?: string
    perTx?: string
  }
  allowedRecipients?: string[]
}

export interface CreateWalletResponse {
  walletAddress: string
  agentId: string
  txHash: string
}

export interface PaymentRequest {
  to: string
  amount: string
  currency: 'USDC'
  memo?: string
}

export interface PaymentResponse {
  hash: string
  status: 'pending' | 'confirmed'
  amount: string
  to: string
  timestamp: Date
}

// Chain constants
export const SUPPORTED_CHAINS = {
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
} as const

export const USDC_ADDRESSES: Record<number, string> = {
  [SUPPORTED_CHAINS.BASE_MAINNET]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [SUPPORTED_CHAINS.BASE_SEPOLIA]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
}
