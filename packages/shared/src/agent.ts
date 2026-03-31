import type { Address, Hex } from './primitives'

export enum AgentStatus {
  Active = 0,
  Paused = 1,
  Revoked = 2,
}

export interface AgentRecord {
  wallet: Address
  operator: Address
  manifestHash: Hex
  registeredAt: bigint
  lastActiveAt: bigint
  executionCount: number
  totalSettled: bigint
  reputationScore: number
  status: AgentStatus
}

export interface AgentCapability {
  name: string
  description: string
  maxAmount?: string
  currency?: 'USDC'
  allowlist?: Address[]
}

export interface AgentSafetyPolicy {
  dailySpendLimit: string
  perTxLimit: string
  restrictedToAllowlist: boolean
  guardrails: string[]
}

export interface AgentManifest {
  schemaVersion: '1.0'
  agentId: string
  name: string
  version: string
  description: string
  operator: Address
  wallet: Address
  chainId: number
  capabilities: AgentCapability[]
  frameworks: string[]
  safetyPolicy: AgentSafetyPolicy
  createdAt: string
}

export type AgentLifecycleStatus = 'active' | 'paused' | 'revoked'

export interface Agent {
  id: string
  name: string
  walletAddress: Address
  operator: Address
  chainId: number
  status: AgentLifecycleStatus
  dailyLimit: string
  perTxLimit: string
  dailySpent: string
  balance: string
  reputationScore: number
  executionCount: number
  totalSettled: string
  createdAt: Date
  lastActiveAt?: Date
}
