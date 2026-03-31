import type { X402PaymentRequired } from '@agentpay/shared'

export type PaymentHandler = (required: X402PaymentRequired) => Promise<{
  txHash: `0x${string}`
  amount: string
}>

export interface X402Options {
  onPaymentRequired: PaymentHandler
  maxRetries?: number
  onRetry?: (attempt: number, txHash: `0x${string}`) => void
  onPaymentSuccess?: (required: X402PaymentRequired, txHash: `0x${string}`) => void
}

export function createX402Fetch(options: X402Options) {
  const { onPaymentRequired, onRetry, onPaymentSuccess } = options
  const maxRetries = Math.max(0, Math.floor(options.maxRetries ?? 2))

  return async function x402Fetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    let currentInit = init
    let lastPayment:
      | { required: X402PaymentRequired; txHash: `0x${string}` }
      | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(input, currentInit)

      if (response.status !== 402) {
        if (lastPayment) {
          onPaymentSuccess?.(lastPayment.required, lastPayment.txHash)
        }
        return response
      }

      const required = await parseX402Response(response)
      if (!required) {
        return response
      }

      if (attempt === maxRetries) {
        return response
      }

      const { txHash, amount } = await onPaymentRequired(required)

      lastPayment = { required, txHash }

      currentInit = {
        ...currentInit,
        headers: withPaymentHeaders(currentInit?.headers, {
          txHash,
          amount,
          chainId: required.chainId,
          payTo: required.payTo,
        }),
      }

      onRetry?.(attempt + 1, txHash)
    }

    throw new Error('x402: retry loop exited unexpectedly')
  }
}

function withPaymentHeaders(
  headers: HeadersInit | undefined,
  payment: {
    txHash: `0x${string}`
    amount: string
    chainId: number
    payTo: `0x${string}`
  },
): Headers {
  const merged = new Headers(headers)
  merged.set('x-payment-tx', payment.txHash)
  merged.set('x-payment-amount', payment.amount)
  merged.set('x-payment-chain', String(payment.chainId))
  merged.set('x-payment-to', payment.payTo)
  return merged
}

export async function parseX402Response(
  response: Response,
): Promise<X402PaymentRequired | null> {
  if (response.status !== 402) {
    return null
  }

  try {
    const body = (await response.clone().json()) as Partial<X402PaymentRequired>
    if (!body.payTo || !body.amount) {
      return null
    }

    return body as X402PaymentRequired
  } catch {
    return null
  }
}
