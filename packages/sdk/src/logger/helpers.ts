import { keccak256, toHex } from 'viem'
import type { AgentLog, AgentLogEntry } from '@atactant/shared'

export function createSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function hashLogEntry(
  entry: AgentLogEntry,
  override?: `0x${string}`,
): `0x${string}` {
  return override ?? keccak256(toHex(JSON.stringify(entry, null, 0)))
}

export function cloneLog(log: AgentLog): AgentLog {
  return JSON.parse(JSON.stringify(log)) as AgentLog
}
