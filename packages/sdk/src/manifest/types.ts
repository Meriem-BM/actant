import type { AgentCapability, WalletConfig } from '@actant/shared'

export type BuildManifestParams = {
  agentId: string
  name: string
  version?: string
  description: string
  operator: `0x${string}`
  wallet: `0x${string}`
  chainId: number
  config: WalletConfig
  capabilities?: AgentCapability[]
  frameworks?: string[]
}
