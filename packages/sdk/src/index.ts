/**
 * @actant/sdk — Payment infrastructure SDK for autonomous AI agents.
 *
 * Core primitives:
 * - AgentWallet: ERC-4337 execution account with programmable spend policy
 * - AgentLogger: ERC-8004 structured execution log writer (agent_log.json)
 * - buildManifest / hashManifest: ERC-8004 capability manifest (agent.json)
 * - createX402Fetch: HTTP 402 auto-payment interceptor
 *
 * @example
 * import { AgentWallet, AgentLogger } from '@actant/sdk'
 *
 * const wallet = await AgentWallet.create({
 *   name: 'trading-bot',
 *   spendingLimit: { daily: '50.00', perTx: '5.00' },
 * }, client)
 *
 * const tx = await wallet.pay({
 *   to: '0xRecipient',
 *   amount: '0.04',
 *   currency: 'USDC',
 *   memo: 'openai-api-call',
 * })
 */

// Core wallet
export { AgentWallet }             from './wallet'
export type { ActantClientConfig } from './wallet'

// ERC-8004 manifest
export {
  buildManifest,
  hashManifest,
  computeAgentId,
}                                  from './manifest'

// Execution logger
export { AgentLogger }             from './logger'

// x402 machine payments
export {
  createX402Fetch,
  parseX402Response,
}                                  from './x402'
export type { X402Options, PaymentHandler } from './x402'

// ABIs (for advanced usage / direct viem calls)
export {
  AGENT_WALLET_ABI,
  AGENT_REGISTRY_ABI,
  AGENT_WALLET_FACTORY_ABI,
  ERC20_ABI,
}                                  from './abis'

// Re-export shared types
export type {
  WalletConfig,
  CreateWalletResponse,
  PaymentRequest,
  PaymentResponse,
  AgentManifest,
  AgentCapability,
  AgentSafetyPolicy,
  AgentLogEntry,
  AgentLog,
  AgentRecord,
  AgentStatus,
  X402PaymentRequired,
  Transaction,
  Agent,
  UserOperation,
}                                  from '@agentpay/shared'

export {
  USDC_ADDRESSES,
  CONTRACT_ADDRESSES,
  SUPPORTED_CHAINS,
  AgentStatus as AgentStatusEnum,
}                                  from '@agentpay/shared'
