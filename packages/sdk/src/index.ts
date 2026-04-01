export { AgentWallet } from './wallet'
export type { ActantClientConfig, WalletClientLike } from './wallet'

export { buildManifest, hashManifest, computeAgentId } from './manifest'
export { AgentLogger } from './logger'

export { createX402Fetch, parseX402Response } from './x402'
export type { X402Options, PaymentHandler } from './x402'

export {
  AGENT_WALLET_ABI,
  AGENT_REGISTRY_ABI,
  AGENT_WALLET_FACTORY_ABI,
  ERC20_ABI,
} from './abis'

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
} from '@atactant/shared'

export {
  USDC_ADDRESSES,
  CONTRACT_ADDRESSES,
  SUPPORTED_CHAINS,
  AgentStatus as AgentStatusEnum,
} from '@atactant/shared'

export {
  ENTRY_POINT,
  ENTRY_POINT_ABI,
  getUserOpHash,
  signUserOp,
  encodePayCallData,
  estimateUserOpGas,
  sendUserOperation,
  waitForUserOpReceipt,
} from './bundler'
export type { GasEstimate, UserOpReceipt } from './bundler'
