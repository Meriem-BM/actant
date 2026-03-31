import { keccak256, toHex } from 'viem'
import type { AgentLog, AgentLogEntry } from '@agentpay/shared'

/**
 * AgentLogger — structured execution log writer (ERC-8004 agent_log.json).
 *
 * Maintains an in-memory log of agent actions. Each entry is hashed and
 * that hash is committed on-chain via AgentRegistry.logExecution(), creating
 * a tamper-evident audit trail for verifiable agent behaviour.
 *
 * For payment entries, callers should pass the logHash extracted from the
 * on-chain PaymentSent event so the off-chain record matches the registry.
 * For all other entry types, the hash is computed from the JSON of the entry.
 */
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

  // ------------------------------------------------------------
  //                       Logging Helpers
  // ------------------------------------------------------------

  /**
   * Log a USDC payment.
   *
   * @param logHash  When provided, used as-is (should be the hash extracted
   *                 from the on-chain PaymentSent event so the entry is
   *                 verifiable against AgentRegistry). When omitted, a
   *                 hash of the JSON entry is computed instead.
   */
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

  // ------------------------------------------------------------
  //                           Reads
  // ------------------------------------------------------------

  getLog(): AgentLog {
    return { ...this.log, entries: [...this.log.entries] }
  }

  getEntries(): AgentLogEntry[] {
    return [...this.log.entries]
  }

  getSessionId(): string {
    return this.log.sessionId
  }

  /** Returns the last log entry — useful for getting the logHash to commit on-chain. */
  getLastEntry(): AgentLogEntry | undefined {
    return this.log.entries.at(-1)
  }

  /** Serialize the full log as JSON (write this to agent_log.json). */
  serialize(): string {
    return JSON.stringify(this.log, null, 2)
  }

  // ------------------------------------------------------------
  //                        Internal
  // ------------------------------------------------------------

  /**
   * Build a log entry and assign its logHash.
   *
   * @param logHashOverride  When provided (payment entries with an on-chain receipt),
   *                         this hash is used directly so the entry is verifiable
   *                         against the PaymentSent / ExecutionLogged events.
   *                         For all other entries, a keccak256 of the JSON is used.
   */
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
}
