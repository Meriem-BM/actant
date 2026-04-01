import { keccak256, toHex } from 'viem'
import { SUPPORTED_CHAINS } from '@atactant/shared'

export const DEFAULT_CHAIN_ID = SUPPORTED_CHAINS.BASE_SEPOLIA
export const DEFAULT_DAILY_LIMIT = '50.00'
export const DEFAULT_PER_TX_LIMIT = '5.00'
export const DEFAULT_MAX_FEE_PER_GAS = 100_000_000n
export const DEFAULT_MAX_PRIORITY_FEE_PER_GAS = 1_000_000n

export const GAS_BUFFER_MULTIPLIER = 120n
export const GAS_BUFFER_DIVISOR = 100n

export const USDC_DECIMALS = 6
export const ZERO_LOG_HASH = `0x${'0'.repeat(64)}` as const

export const RECEIPT_RPC_RETRY_LIMIT = 6
export const RECEIPT_RPC_RETRY_DELAY_MS = 1500

export const PAYMENT_LOG_HASH_START = 128
export const PAYMENT_LOG_HASH_END = 192
export const MIN_PAYMENT_LOG_DATA_HEX_LEN = PAYMENT_LOG_HASH_END
export const PAYMENT_SENT_TOPIC = keccak256(
  toHex('PaymentSent(address,uint256,string,bytes32)'),
)
