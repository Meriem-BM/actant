import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  isAddress,
  isHash,
  parseUnits,
  type Chain,
} from 'viem'
import { base, baseSepolia } from 'viem/chains'
import {
  SUPPORTED_CHAINS,
  USDC_ADDRESSES,
  type PaymentRequest,
  type WalletConfig,
} from '@atactant/shared'
import { AGENT_WALLET_ABI } from '../abis'
import {
  DEFAULT_CHAIN_ID,
  DEFAULT_DAILY_LIMIT,
  DEFAULT_PER_TX_LIMIT,
  GAS_BUFFER_DIVISOR,
  GAS_BUFFER_MULTIPLIER,
  MIN_PAYMENT_LOG_DATA_HEX_LEN,
  PAYMENT_LOG_HASH_END,
  PAYMENT_LOG_HASH_START,
  PAYMENT_SENT_TOPIC,
  USDC_DECIMALS,
} from './constants'
import { waitForSuccessReceipt } from './receipts'
import type {
  ActantClientConfig,
  Address,
  Bytes32,
  ClientContext,
  PaymentInput,
  PaymentSentLog,
  TxHash,
  WalletClientLike,
} from './types'

function getChain(chainId: number): Chain {
  return chainId === SUPPORTED_CHAINS.BASE_MAINNET ? base : baseSepolia
}

function resolveRpcUrl(chain: Chain, customRpcUrl?: string): string {
  return customRpcUrl ?? chain.rpcUrls.default.http[0]
}

export function toUSDC(amount: string): bigint {
  return parseUnits(amount, USDC_DECIMALS)
}

export function fromUSDC(rawAmount: bigint): string {
  return formatUnits(rawAmount, USDC_DECIMALS)
}

export function assertAddress(value: string, field: string): asserts value is Address {
  if (!isAddress(value)) {
    throw new Error(`Invalid ${field} address: ${value}`)
  }
}

export function assertBytes32(value: string, field: string): asserts value is Bytes32 {
  if (!isHash(value)) {
    throw new Error(`Invalid ${field} bytes32 hash: ${value}`)
  }
}

export function resolveSpendingLimits(config: WalletConfig): {
  dailyLimit: string
  perTxLimit: string
} {
  return {
    dailyLimit: config.spendingLimit?.daily ?? DEFAULT_DAILY_LIMIT,
    perTxLimit: config.spendingLimit?.perTx ?? DEFAULT_PER_TX_LIMIT,
  }
}

export function normalizePaymentInput(request: PaymentRequest): PaymentInput {
  if (request.currency !== 'USDC') {
    throw new Error(`Unsupported currency: ${request.currency}`)
  }

  if (!isAddress(request.to)) {
    throw new Error(`Invalid payment recipient address: ${request.to}`)
  }

  return {
    to: request.to,
    amount: toUSDC(request.amount),
    amountRaw: request.amount,
    memo: request.memo ?? '',
  }
}

export function applyGasBuffer(value: bigint): bigint {
  return (value * GAS_BUFFER_MULTIPLIER) / GAS_BUFFER_DIVISOR
}

export function extractPaymentLogHash(
  logs: readonly PaymentSentLog[],
): Bytes32 | null {
  for (const log of logs) {
    if (log.topics[0] !== PAYMENT_SENT_TOPIC) {
      continue
    }

    const dataHex = log.data.slice(2)
    if (dataHex.length < MIN_PAYMENT_LOG_DATA_HEX_LEN) {
      continue
    }

    return `0x${dataHex.slice(PAYMENT_LOG_HASH_START, PAYMENT_LOG_HASH_END)}` as Bytes32
  }

  return null
}

export function createClientContext(config: ActantClientConfig): ClientContext {
  const chainId = config.chainId ?? DEFAULT_CHAIN_ID
  const chain = getChain(chainId)
  const rpcUrl = resolveRpcUrl(chain, config.rpcUrl)

  const usdcAddress = USDC_ADDRESSES[chainId]
  if (!usdcAddress) {
    throw new Error(`Unsupported chainId: ${chainId}`)
  }

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })

  const walletClient =
    config.externalWalletClient ??
    (createWalletClient({
      chain,
      transport: http(rpcUrl),
      account: config.account,
    }) as unknown as WalletClientLike)

  if (
    typeof walletClient.writeContract !== 'function' ||
    typeof walletClient.sendTransaction !== 'function'
  ) {
    throw new Error(
      'Invalid wallet client: writeContract and sendTransaction are required',
    )
  }

  return {
    chainId,
    chain,
    publicClient,
    walletClient,
    usdcAddress,
  }
}

export async function configureAllowedRecipients(params: {
  recipients: readonly Address[]
  walletAddress: Address
  chain: Chain
  publicClient: ReturnType<typeof createPublicClient>
  walletClient: WalletClientLike
}): Promise<void> {
  for (const recipient of params.recipients) {
    assertAddress(recipient, 'allowed recipient')
    const allowTx = (await params.walletClient.writeContract({
      address: params.walletAddress,
      abi: AGENT_WALLET_ABI,
      functionName: 'allowRecipient',
      args: [recipient],
      chain: params.chain,
    })) as TxHash
    await waitForSuccessReceipt(
      params.publicClient,
      allowTx,
      'AgentWallet.create.allowRecipient',
    )
  }
}
