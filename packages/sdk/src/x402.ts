import type { X402PaymentRequired } from '@agentpay/shared'

/**
 * x402 — HTTP 402 Payment Required interceptor.
 *
 * x402 is the machine-to-machine payment protocol:
 * 1. Agent makes an HTTP request to a paid API endpoint
 * 2. Server responds with 402 + payment details in the body
 * 3. x402 interceptor makes the payment via AgentWallet
 * 4. Interceptor retries the original request with a payment proof header
 *
 * This makes the agent's payment completely transparent to the calling code —
 * from the agent's perspective, the fetch just works.
 *
 * References:
 * - x402 spec: https://x402.org
 * - HTTP 402: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/402
 */

export type PaymentHandler = (required: X402PaymentRequired) => Promise<{
  txHash: `0x${string}`
  amount: string
}>

export interface X402Options {
  /** Called when a 402 response is received */
  onPaymentRequired: PaymentHandler
  /** Max number of retries after payment (default: 2) */
  maxRetries?: number
  /** Called before each retry with payment proof */
  onRetry?: (attempt: number, txHash: `0x${string}`) => void
  /** Called when payment succeeds */
  onPaymentSuccess?: (required: X402PaymentRequired, txHash: `0x${string}`) => void
}

/**
 * Wraps the global `fetch` with x402 payment handling.
 *
 * @example
 * const agentFetch = createX402Fetch({
 *   onPaymentRequired: async (req) => {
 *     const { hash } = await wallet.pay({ to: req.payTo, amount: req.amount, currency: 'USDC' })
 *     return { txHash: hash, amount: req.amount }
 *   }
 * })
 *
 * // This call auto-pays if the server returns 402
 * const data = await agentFetch('https://api.example.com/premium-data')
 */
export function createX402Fetch(options: X402Options) {
  const { onPaymentRequired, maxRetries = 2, onRetry, onPaymentSuccess } = options

  return async function x402Fetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    let lastResponse: Response | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(input, init)
      lastResponse = response

      // Not a payment-required response — return immediately
      if (response.status !== 402) {
        return response
      }

      // First attempt with no payment: parse 402 body and pay
      if (attempt === 0) {
        let required: X402PaymentRequired

        try {
          required = await response.json() as X402PaymentRequired
        } catch {
          // 402 with non-JSON body — can't handle it
          return response
        }

        if (!required.payTo || !required.amount) {
          // 402 response doesn't follow x402 spec — return as-is
          return response
        }

        // Make the payment
        const { txHash, amount } = await onPaymentRequired(required)

        onPaymentSuccess?.(required, txHash)

        // Attach payment proof to retry headers
        const proofHeaders = {
          ...flattenHeaders(init?.headers),
          'x-payment-tx':     txHash,
          'x-payment-amount': amount,
          'x-payment-chain':  String(required.chainId),
          'x-payment-to':     required.payTo,
        }

        // Retry with proof
        init = { ...init, headers: proofHeaders }
        onRetry?.(attempt + 1, txHash)
        continue
      }

      // Subsequent retries still getting 402 — payment not accepted
      return response
    }

    return lastResponse!
  }
}

function flattenHeaders(
  headers?: HeadersInit,
): Record<string, string> {
  if (!headers) return {}
  if (headers instanceof Headers) {
    const out: Record<string, string> = {}
    headers.forEach((v, k) => { out[k] = v })
    return out
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  return headers as Record<string, string>
}

/**
 * Parse a 402 response body into an X402PaymentRequired object.
 * Returns null if the body is not a valid x402 response.
 */
export async function parseX402Response(
  response: Response,
): Promise<X402PaymentRequired | null> {
  if (response.status !== 402) return null
  try {
    const body = await response.clone().json() as Partial<X402PaymentRequired>
    if (!body.payTo || !body.amount) return null
    return body as X402PaymentRequired
  } catch (_) {
    return null
  }
}
