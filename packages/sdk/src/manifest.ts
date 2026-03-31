import { keccak256, toHex } from 'viem'
import type { AgentManifest, AgentCapability, AgentSafetyPolicy, WalletConfig } from '@agentpay/shared'

const DEFAULT_DAILY_LIMIT = '50.00'
const DEFAULT_PER_TX_LIMIT = '5.00'
const DEFAULT_FRAMEWORKS = ['@actant/sdk', 'langchain', 'crewai'] as const

export function buildManifest(params: {
  agentId: string
  name: string
  version?: string
  description: string
  operator: `0x${string}`
  wallet: `0x${string}`
  chainId: number
  config: WalletConfig
  capabilities?: AgentCapability[]
  frameworks?: string[]
}): AgentManifest {
  const {
    agentId,
    name,
    version = '1.0.0',
    description,
    operator,
    wallet,
    chainId,
    config,
    frameworks = [],
  } = params

  const dailyLimit = config.spendingLimit?.daily ?? DEFAULT_DAILY_LIMIT
  const perTxLimit = config.spendingLimit?.perTx ?? DEFAULT_PER_TX_LIMIT

  const safetyPolicy: AgentSafetyPolicy = {
    dailySpendLimit: dailyLimit,
    perTxLimit,
    restrictedToAllowlist: (config.allowedRecipients?.length ?? 0) > 0,
    guardrails: [
      `Daily spend capped at ${dailyLimit} USDC`,
      `Per-transaction cap: ${perTxLimit} USDC`,
      'On-chain spend policy enforced before value moves',
      'Operator can pause execution authority instantly',
      'All settlements logged on-chain for audit',
    ],
  }

  const capabilities: AgentCapability[] = params.capabilities ?? [
    {
      name:        'pay',
      description: 'Send USDC to a recipient address',
      maxAmount:   perTxLimit,
      currency:    'USDC',
      allowlist:   config.allowedRecipients,
    },
  ]

  return {
    schemaVersion: '1.0',
    agentId,
    name,
    version,
    description,
    operator,
    wallet,
    chainId,
    capabilities,
    frameworks: frameworks.length > 0 ? frameworks : [...DEFAULT_FRAMEWORKS],
    safetyPolicy,
    createdAt: new Date().toISOString(),
  }
}

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
