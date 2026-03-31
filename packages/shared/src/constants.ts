import type { Address } from './primitives'

export const SUPPORTED_CHAINS = {
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
} as const

export type SupportedChainId =
  (typeof SUPPORTED_CHAINS)[keyof typeof SUPPORTED_CHAINS]

export interface ChainContractAddresses {
  entryPoint: Address
  factory?: Address
  registry?: Address
}

export const USDC_ADDRESSES: Record<number, Address> = {
  [SUPPORTED_CHAINS.BASE_MAINNET]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [SUPPORTED_CHAINS.BASE_SEPOLIA]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
}

export const CONTRACT_ADDRESSES: Record<number, ChainContractAddresses> = {
  [SUPPORTED_CHAINS.BASE_MAINNET]: {
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  },
  [SUPPORTED_CHAINS.BASE_SEPOLIA]: {
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  },
}
