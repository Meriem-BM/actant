import { keccak256, toHex } from 'viem'
import type { AgentManifest, AgentCapability, AgentSafetyPolicy, WalletConfig } from '@agentpay/shared'

/**
 * Builds an ERC-8004 agent capability manifest (agent.json).
 *
 * The manifest is stored off-chain. Its keccak256 hash is committed on-chain
 * in AgentRegistry, creating a tamper-evident link between the on-chain identity
 * and the off-chain capability declaration.
 */
export function buildManifest(params: {
  agentId:    string
  name:       string
  version?:   string
  description: string
  operator:   `0x${string}`
  wallet:     `0x${string}`
  chainId:    number
  config:     WalletConfig
  capabilities?: AgentCapability[]
  frameworks?: string[]
}): AgentManifest {
  const {
    agentId, name, version = '1.0.0', description,
    operator, wallet, chainId, config, frameworks = [],
  } = params

  const safetyPolicy: AgentSafetyPolicy = {
    dailySpendLimit:       config.spendingLimit?.daily  ?? '50.00',
    perTxLimit:            config.spendingLimit?.perTx  ?? '5.00',
    restrictedToAllowlist: (config.allowedRecipients?.length ?? 0) > 0,
    guardrails: [
      `Daily spend capped at ${config.spendingLimit?.daily ?? '50.00'} USDC`,
      `Per-transaction cap: ${config.spendingLimit?.perTx ?? '5.00'} USDC`,
      'On-chain spend policy enforced before value moves',
      'Operator can pause execution authority instantly',
      'All settlements logged on-chain for audit',
    ],
  }

  const capabilities: AgentCapability[] = params.capabilities ?? [
    {
      name:        'pay',
      description: 'Send USDC to a recipient address',
      maxAmount:   config.spendingLimit?.perTx ?? '5.00',
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
    frameworks: frameworks.length > 0 ? frameworks : ['@actant/sdk', 'langchain', 'crewai'],
    safetyPolicy,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Compute the keccak256 hash of a manifest (what gets stored on-chain).
 */
export function hashManifest(manifest: AgentManifest): `0x${string}` {
  const json = JSON.stringify(manifest, null, 0)
  return keccak256(toHex(json))
}

/**
 * Compute the bytes32 agentId from a name + operator + salt.
 * This should match the on-chain agentId used in AgentRegistry.
 */
export function computeAgentId(
  name: string,
  operator: `0x${string}`,
  salt = '0',
): `0x${string}` {
  const packed = `${name}:${operator.toLowerCase()}:${salt}`
  return keccak256(toHex(packed))
}
