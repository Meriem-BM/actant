// ─── Chain constants ──────────────────────────────────────────────────────────

export const SUPPORTED_CHAINS = {
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
} as const

export type SupportedChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS]

export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [SUPPORTED_CHAINS.BASE_MAINNET]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [SUPPORTED_CHAINS.BASE_SEPOLIA]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
}

export const CONTRACT_ADDRESSES: Record<number, {
  entryPoint: `0x${string}`
  factory?:   `0x${string}`
  registry?:  `0x${string}`
}> = {
  [SUPPORTED_CHAINS.BASE_MAINNET]: {
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  },
  [SUPPORTED_CHAINS.BASE_SEPOLIA]: {
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    // Set after deployment:
    // factory:   '0x...',
    // registry:  '0x...',
  },
}

// ─── ERC-4337 types ───────────────────────────────────────────────────────────

export interface UserOperation {
  sender:               `0x${string}`
  nonce:                bigint
  initCode:             `0x${string}`
  callData:             `0x${string}`
  callGasLimit:         bigint
  verificationGasLimit: bigint
  preVerificationGas:   bigint
  maxFeePerGas:         bigint
  maxPriorityFeePerGas: bigint
  paymasterAndData:     `0x${string}`
  signature:            `0x${string}`
}

// ─── ERC-8004 types ───────────────────────────────────────────────────────────

export enum AgentStatus {
  Active  = 0,
  Paused  = 1,
  Revoked = 2,
}

export interface AgentRecord {
  wallet:          `0x${string}`
  operator:        `0x${string}`
  manifestHash:    `0x${string}`
  registeredAt:    bigint
  lastActiveAt:    bigint
  executionCount:  number
  totalSettled:    bigint  // USDC, 6 decimals
  reputationScore: number  // 0–10000 basis points
  status:          AgentStatus
}

/**
 * ERC-8004 agent capability manifest (stored off-chain, hash on-chain).
 * Spec: https://github.com/ethereum/ERCs/issues/8004
 */
export interface AgentManifest {
  /** Manifest version */
  schemaVersion:   '1.0'
  /** Unique agent identifier (matches on-chain agentId bytes32) */
  agentId:         string
  /** Human-readable agent name */
  name:            string
  /** Agent version */
  version:         string
  /** What this agent does */
  description:     string
  /** Address of the operator responsible for this agent */
  operator:        `0x${string}`
  /** ERC-4337 execution account address */
  wallet:          `0x${string}`
  /** Chain the agent operates on */
  chainId:         number
  /** What this agent is allowed to do */
  capabilities:    AgentCapability[]
  /** Frameworks this agent is compatible with */
  frameworks:      string[]
  /** Safety constraints */
  safetyPolicy:    AgentSafetyPolicy
  /** ISO 8601 creation timestamp */
  createdAt:       string
}

export interface AgentCapability {
  /** Unique capability name */
  name:        string
  /** Human-readable description */
  description: string
  /** Maximum USDC per invocation (human-readable, e.g. "5.00") */
  maxAmount?:  string
  /** Currency (always "USDC" for now) */
  currency?:   'USDC'
  /** Allowed recipient addresses (empty = all allowed) */
  allowlist?:  `0x${string}`[]
}

export interface AgentSafetyPolicy {
  /** Max USDC per day (human-readable) */
  dailySpendLimit: string
  /** Max USDC per transaction (human-readable) */
  perTxLimit:      string
  /** Whether the agent can call arbitrary contracts */
  restrictedToAllowlist: boolean
  /** Human-readable description of the guardrails */
  guardrails:      string[]
}

// ─── Execution log types (agent_log.json) ────────────────────────────────────

/**
 * A single entry in the agent execution log.
 * The keccak256 of the JSON-serialized entry is committed on-chain.
 */
export interface AgentLogEntry {
  /** ISO 8601 timestamp */
  timestamp:     string
  /** Matches on-chain agentId */
  agentId:       string
  /** Type of action */
  actionType:    'payment' | 'api_call' | 'decision' | 'error'
  /** Human-readable description */
  description:   string
  /** Payment details (if actionType === 'payment') */
  payment?:      {
    to:           `0x${string}`
    amount:       string  // human-readable, e.g. "0.04"
    currency:     'USDC'
    memo:         string
    txHash?:      `0x${string}`
    blockNumber?: number
  }
  /** Tool/API call details */
  toolCall?:     {
    tool:     string
    input:    Record<string, unknown>
    output?:  unknown
    latencyMs?: number
  }
  /** Whether this action succeeded */
  success:   boolean
  /** keccak256 of this entry — committed on-chain for verifiability */
  logHash?:  `0x${string}`
}

export interface AgentLog {
  agentId:    string
  agentName:  string
  sessionId:  string
  startedAt:  string
  entries:    AgentLogEntry[]
}

// ─── Wallet / payment types ───────────────────────────────────────────────────

export interface WalletConfig {
  name:       string
  chainId?:   number
  spendingLimit?: {
    daily?: string   // human-readable USDC, e.g. "50.00"
    perTx?: string   // human-readable USDC, e.g. "5.00"
  }
  allowedRecipients?: `0x${string}`[]
}

export interface CreateWalletResponse {
  walletAddress: `0x${string}`
  agentId:       `0x${string}`
  txHash:        `0x${string}`
  manifest:      AgentManifest
}

export interface PaymentRequest {
  to:       `0x${string}` | string
  amount:   string          // human-readable, e.g. "0.10"
  currency: 'USDC'
  memo?:    string
}

export interface PaymentResponse {
  hash:        `0x${string}`
  status:      'pending' | 'confirmed'
  amount:      string
  to:          `0x${string}`
  timestamp:   Date
  logHash:     `0x${string}`
}

// ─── x402 types ───────────────────────────────────────────────────────────────

/**
 * HTTP 402 Payment Required response body.
 * x402 spec: machine-to-machine payment protocol.
 */
export interface X402PaymentRequired {
  /** Human-readable reason */
  error:     string
  /** Amount required (human-readable) */
  amount:    string
  /** Currency, typically "USDC" */
  currency:  string
  /** Recipient address to pay */
  payTo:     `0x${string}`
  /** Chain to pay on */
  chainId:   number
  /** Brief description of what the payment unlocks */
  resource:  string
  /** Optional: nonce to include in payment memo to prevent replay */
  nonce?:    string
}

// ─── Agent (dashboard/API entity) ────────────────────────────────────────────

export interface Agent {
  id:             string
  name:           string
  walletAddress:  `0x${string}`
  operator:       `0x${string}`
  chainId:        number
  status:         'active' | 'paused' | 'revoked'
  dailyLimit:     string
  perTxLimit:     string
  dailySpent:     string
  balance:        string
  reputationScore: number
  executionCount: number
  totalSettled:   string
  createdAt:      Date
  lastActiveAt?:  Date
}

export interface Transaction {
  hash:        `0x${string}`
  agentId:     string
  from:        `0x${string}`
  to:          `0x${string}`
  amount:      string
  currency:    'USDC'
  memo?:       string
  status:      'pending' | 'confirmed' | 'failed'
  blockNumber?: number
  timestamp:   Date
  logHash?:    `0x${string}`
}
