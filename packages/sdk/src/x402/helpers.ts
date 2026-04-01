import {
  DEFAULT_MAX_RETRIES,
  HTTP_STATUS_PAYMENT_REQUIRED,
  MIN_RETRIES,
  PAYMENT_HEADERS,
} from './constants'
import type { PaymentHeaderInput } from './types'

export function normalizeMaxRetries(maxRetries?: number): number {
  return Math.max(MIN_RETRIES, Math.floor(maxRetries ?? DEFAULT_MAX_RETRIES))
}

export function isPaymentRequiredResponse(response: Response): boolean {
  return response.status === HTTP_STATUS_PAYMENT_REQUIRED
}

export function withPaymentHeaders(
  headers: HeadersInit | undefined,
  payment: PaymentHeaderInput,
): Headers {
  const merged = new Headers(headers)
  merged.set(PAYMENT_HEADERS.tx, payment.txHash)
  merged.set(PAYMENT_HEADERS.amount, payment.amount)
  merged.set(PAYMENT_HEADERS.chain, String(payment.chainId))
  merged.set(PAYMENT_HEADERS.to, payment.payTo)
  return merged
}

export function applyPaymentToRequest(
  init: RequestInit | undefined,
  payment: PaymentHeaderInput,
): RequestInit {
  return {
    ...init,
    headers: withPaymentHeaders(init?.headers, payment),
  }
}
