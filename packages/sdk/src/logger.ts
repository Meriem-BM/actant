import { keccak256, toHex } from 'viem'
import type { AgentLog, AgentLogEntry } from '@agentpay/shared'

export class AgentLogger {
  private log: AgentLog

  constructor(params: { agentId: string; agentName: string }) {
    this.log = {
      agentId:   params.agentId,
      agentName: params.agentName,
      sessionId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startedAt: new Date().toISOString(),
      entries:   [],
    }
  }

  logPayment(params: {
    to:           `0x${string}`
    amount:       string
    currency:     'USDC'
    memo:         string
    txHash?:      `0x${string}`
    blockNumber?: number
    success?:     boolean
    logHash?:     `0x${string}`
  }): AgentLogEntry {
    const entry = this._makeEntry(
      {
        actionType:  'payment',
        description: `Paid ${params.amount} ${params.currency} to ${params.to} — ${params.memo}`,
        payment: {
          to:          params.to,
          amount:      params.amount,
          currency:    params.currency,
          memo:        params.memo,
          txHash:      params.txHash,
          blockNumber: params.blockNumber,
        },
        success: params.success ?? true,
      },
      params.logHash,
    )
    this.log.entries.push(entry)
    return entry
  }

  logToolCall(params: {
    tool:       string
    input:      Record<string, unknown>
    output?:    unknown
    latencyMs?: number
    success?:   boolean
  }): AgentLogEntry {
    const entry = this._makeEntry({
      actionType:  'api_call',
      description: `Tool call: ${params.tool}`,
      toolCall: {
        tool:      params.tool,
        input:     params.input,
        output:    params.output,
        latencyMs: params.latencyMs,
      },
      success: params.success ?? true,
    })
    this.log.entries.push(entry)
    return entry
  }

  logDecision(description: string, success = true): AgentLogEntry {
    const entry = this._makeEntry({ actionType: 'decision', description, success })
    this.log.entries.push(entry)
    return entry
  }

  logError(description: string, error?: unknown): AgentLogEntry {
    const entry = this._makeEntry({
      actionType:  'error',
      description: `${description}${error ? `: ${String(error)}` : ''}`,
      success:     false,
    })
    this.log.entries.push(entry)
    return entry
  }

  getLog(): AgentLog {
    return this.cloneLog()
  }

  getEntries(): AgentLogEntry[] {
    return this.cloneLog().entries
  }

  getSessionId(): string {
    return this.log.sessionId
  }

  getLastEntry(): AgentLogEntry | undefined {
    return this.log.entries.at(-1)
  }

  serialize(): string {
    return JSON.stringify(this.log, null, 2)
  }

  private _makeEntry(
    params: Omit<AgentLogEntry, 'timestamp' | 'agentId' | 'logHash'>,
    logHashOverride?: `0x${string}`,
  ): AgentLogEntry {
    const entry: AgentLogEntry = {
      timestamp: new Date().toISOString(),
      agentId:   this.log.agentId,
      ...params,
    }

    entry.logHash = logHashOverride ?? keccak256(toHex(JSON.stringify(entry, null, 0)))

    return entry
  }

  private cloneLog(): AgentLog {
    return JSON.parse(JSON.stringify(this.log)) as AgentLog
  }
}
