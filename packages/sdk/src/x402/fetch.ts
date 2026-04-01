import type { X402PaymentRequired } from '@actant/shared'
import {
  applyPaymentToRequest,
  isPaymentRequiredResponse,
  normalizeMaxRetries,
} from './helpers'
import type { LastPayment, X402Options } from './types'

export function createX402Fetch(options: X402Options) {
  const { onPaymentRequired, onRetry, onPaymentSuccess } = options
  const maxRetries = normalizeMaxRetries(options.maxRetries)

  return async function x402Fetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    let currentInit = init
    let lastPayment: LastPayment | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(input, currentInit)

      if (!isPaymentRequiredResponse(response)) {
        if (lastPayment) {
          onPaymentSuccess?.(lastPayment.required, lastPayment.txHash)
        }
        return response
      }

      const required = await parseX402Response(response)
      if (!required || attempt === maxRetries) {
        return response
      }

      const { txHash, amount } = await onPaymentRequired(required)
      lastPayment = { required, txHash }

      currentInit = applyPaymentToRequest(currentInit, {
        txHash,
        amount,
        chainId: required.chainId,
        payTo: required.payTo,
      })

      onRetry?.(attempt + 1, txHash)
    }

    throw new Error('x402: retry loop exited unexpectedly')
  }
}

export async function parseX402Response(
  response: Response,
): Promise<X402PaymentRequired | null> {
  if (!isPaymentRequiredResponse(response)) {
    return null
  }

  try {
    const body = (await response.clone().json()) as Partial<X402PaymentRequired>
    if (!body.payTo || !body.amount || typeof body.chainId !== 'number') {
      return null
    }
    return body as X402PaymentRequired
  } catch {
    return null
  }
}
