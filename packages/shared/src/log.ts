import type { Address, Hex } from './primitives'

export type AgentActionType = 'payment' | 'api_call' | 'decision' | 'error'

export interface AgentPaymentLog {
  to: Address
  amount: string
  currency: 'USDC'
  memo: string
  txHash?: Hex
  blockNumber?: number
}

export interface AgentToolCallLog {
  tool: string
  input: Record<string, unknown>
  output?: unknown
  latencyMs?: number
}

export interface AgentLogEntry {
  timestamp: string
  agentId: string
  actionType: AgentActionType
  description: string
  payment?: AgentPaymentLog
  toolCall?: AgentToolCallLog
  success: boolean
  logHash?: Hex
}

export interface AgentLog {
  agentId: string
  agentName: string
  sessionId: string
  startedAt: string
  entries: AgentLogEntry[]
}
