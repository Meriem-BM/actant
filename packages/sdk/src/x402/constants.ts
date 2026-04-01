export const HTTP_STATUS_PAYMENT_REQUIRED = 402
export const DEFAULT_MAX_RETRIES = 2
export const MIN_RETRIES = 0

export const PAYMENT_HEADERS = {
  tx: 'x-payment-tx',
  amount: 'x-payment-amount',
  chain: 'x-payment-chain',
  to: 'x-payment-to',
} as const
