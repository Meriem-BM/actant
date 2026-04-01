import { type TransactionReceipt, type createPublicClient } from 'viem'
import {
  RECEIPT_RPC_RETRY_DELAY_MS,
  RECEIPT_RPC_RETRY_LIMIT,
} from './constants'
import type { TxHash } from './types'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientReceiptError(error: unknown): boolean {
  const message = String(error).toLowerCase()
  return (
    message.includes('no backend is currently healthy') ||
    message.includes('temporarily unavailable') ||
    message.includes('gateway timeout') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('fetch failed') ||
    message.includes('network error') ||
    message.includes('econnreset') ||
    message.includes('503') ||
    message.includes('429')
  )
}

export async function waitForTransactionReceiptWithRetry(
  publicClient: ReturnType<typeof createPublicClient>,
  txHash: TxHash,
  context: string,
): Promise<TransactionReceipt> {
  let lastError: unknown

  for (let attempt = 1; attempt <= RECEIPT_RPC_RETRY_LIMIT; attempt++) {
    try {
      return await publicClient.waitForTransactionReceipt({ hash: txHash })
    } catch (error) {
      lastError = error
      const isRetryable = isTransientReceiptError(error)
      if (!isRetryable || attempt === RECEIPT_RPC_RETRY_LIMIT) {
        throw new Error(
          `${context}: failed to fetch transaction receipt for ${txHash}: ${String(error)}`,
        )
      }
      await sleep(RECEIPT_RPC_RETRY_DELAY_MS * attempt)
    }
  }

  throw new Error(
    `${context}: failed to fetch transaction receipt for ${txHash}: ${String(lastError)}`,
  )
}

export async function waitForSuccessReceipt(
  publicClient: ReturnType<typeof createPublicClient>,
  txHash: TxHash,
  context: string,
): Promise<void> {
  const receipt = await waitForTransactionReceiptWithRetry(
    publicClient,
    txHash,
    context,
  )
  if (receipt.status !== 'success') {
    throw new Error(`${context}: transaction reverted — ${txHash}`)
  }
}
