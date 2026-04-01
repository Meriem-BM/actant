import { keccak256, toHex } from 'viem'
import type { AgentManifest } from '@atactant/shared'

export function hashManifest(manifest: AgentManifest): `0x${string}` {
  const json = JSON.stringify(manifest)
  return keccak256(toHex(json))
}

export function computeAgentId(
  name: string,
  operator: `0x${string}`,
  salt = '0',
): `0x${string}` {
  const packed = `${name}:${operator.toLowerCase()}:${salt}`
  return keccak256(toHex(packed))
}
