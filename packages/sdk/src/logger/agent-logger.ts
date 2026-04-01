import type { AgentLog, AgentLogEntry } from '@atactant/shared'
import { cloneLog, createSessionId, hashLogEntry } from './helpers'
import type {
  BaseEntryInput,
  LoggerInit,
  LogPaymentInput,
  LogToolCallInput,
} from './types'

export class AgentLogger {
  private log: AgentLog

  constructor(params: LoggerInit) {
    this.log = {
      agentId: params.agentId,
      agentName: params.agentName,
      sessionId: createSessionId(),
      startedAt: new Date().toISOString(),
      entries: [],
    }
  }

  logPayment(params: LogPaymentInput): AgentLogEntry {
    const entry = this.makeEntry(
      {
        actionType: 'payment',
        description: `Paid ${params.amount} ${params.currency} to ${params.to} — ${params.memo}`,
        payment: {
          to: params.to,
          amount: params.amount,
          currency: params.currency,
          memo: params.memo,
          txHash: params.txHash,
          blockNumber: params.blockNumber,
        },
        success: params.success ?? true,
      },
      params.logHash,
    )
    this.log.entries.push(entry)
    return entry
  }

  logToolCall(params: LogToolCallInput): AgentLogEntry {
    const entry = this.makeEntry({
      actionType: 'api_call',
      description: `Tool call: ${params.tool}`,
      toolCall: {
        tool: params.tool,
        input: params.input,
        output: params.output,
        latencyMs: params.latencyMs,
      },
      success: params.success ?? true,
    })
    this.log.entries.push(entry)
    return entry
  }

  logDecision(description: string, success = true): AgentLogEntry {
    const entry = this.makeEntry({ actionType: 'decision', description, success })
    this.log.entries.push(entry)
    return entry
  }

  logError(description: string, error?: unknown): AgentLogEntry {
    const entry = this.makeEntry({
      actionType: 'error',
      description: `${description}${error ? `: ${String(error)}` : ''}`,
      success: false,
    })
    this.log.entries.push(entry)
    return entry
  }

  getLog(): AgentLog {
    return cloneLog(this.log)
  }

  getEntries(): AgentLogEntry[] {
    return cloneLog(this.log).entries
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

  private makeEntry(
    params: BaseEntryInput,
    logHashOverride?: `0x${string}`,
  ): AgentLogEntry {
    const entry: AgentLogEntry = {
      timestamp: new Date().toISOString(),
      agentId: this.log.agentId,
      ...params,
    }

    entry.logHash = hashLogEntry(entry, logHashOverride)
    return entry
  }
}
