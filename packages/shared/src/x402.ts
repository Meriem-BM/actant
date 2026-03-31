import type { Address } from './primitives'

export interface X402PaymentRequired {
  error: string
  amount: string
  currency: string
  payTo: Address
  chainId: number
  resource: string
  nonce?: string
}
