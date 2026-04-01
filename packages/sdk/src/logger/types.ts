import type { AgentLogEntry } from '@atactant/shared'

export type LoggerInit = {
  agentId: string
  agentName: string
}

export type LogPaymentInput = {
  to: `0x${string}`
  amount: string
  currency: 'USDC'
  memo: string
  txHash?: `0x${string}`
  blockNumber?: number
  success?: boolean
  logHash?: `0x${string}`
}

export type LogToolCallInput = {
  tool: string
  input: Record<string, unknown>
  output?: unknown
  latencyMs?: number
  success?: boolean
}

export type BaseEntryInput = Omit<AgentLogEntry, 'timestamp' | 'agentId' | 'logHash'>
