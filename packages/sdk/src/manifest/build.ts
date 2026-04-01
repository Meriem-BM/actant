import type {
  AgentCapability,
  AgentManifest,
  AgentSafetyPolicy,
} from '@atactant/shared'
import {
  DEFAULT_DAILY_LIMIT,
  DEFAULT_FRAMEWORKS,
  DEFAULT_PER_TX_LIMIT,
} from './constants'
import type { BuildManifestParams } from './types'

function buildSafetyPolicy(
  dailyLimit: string,
  perTxLimit: string,
  restrictedToAllowlist: boolean,
): AgentSafetyPolicy {
  return {
    dailySpendLimit: dailyLimit,
    perTxLimit,
    restrictedToAllowlist,
    guardrails: [
      `Daily spend capped at ${dailyLimit} USDC`,
      `Per-transaction cap: ${perTxLimit} USDC`,
      'On-chain spend policy enforced before value moves',
      'Operator can pause execution authority instantly',
      'All settlements logged on-chain for audit',
    ],
  }
}

function buildDefaultCapabilities(
  perTxLimit: string,
  allowlist?: `0x${string}`[],
): AgentCapability[] {
  return [
    {
      name: 'pay',
      description: 'Send USDC to a recipient address',
      maxAmount: perTxLimit,
      currency: 'USDC',
      allowlist,
    },
  ]
}

export function buildManifest(params: BuildManifestParams): AgentManifest {
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

  const safetyPolicy = buildSafetyPolicy(
    dailyLimit,
    perTxLimit,
    (config.allowedRecipients?.length ?? 0) > 0,
  )

  const capabilities: AgentCapability[] =
    params.capabilities ??
    buildDefaultCapabilities(perTxLimit, config.allowedRecipients)

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
