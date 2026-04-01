import type { X402PaymentRequired } from '@actant/shared'

export type TxHash = `0x${string}`

export type LastPayment = {
  required: X402PaymentRequired
  txHash: TxHash
}

export type PaymentHeaderInput = {
  txHash: TxHash
  amount: string
  chainId: number
  payTo: `0x${string}`
}

export type PaymentHandler = (required: X402PaymentRequired) => Promise<{
  txHash: TxHash
  amount: string
}>

export interface X402Options {
  onPaymentRequired: PaymentHandler
  maxRetries?: number
  onRetry?: (attempt: number, txHash: TxHash) => void
  onPaymentSuccess?: (required: X402PaymentRequired, txHash: TxHash) => void
}
