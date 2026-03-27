import type {
  WalletConfig,
  CreateWalletResponse,
  PaymentRequest,
  PaymentResponse,
} from '@agentpay/shared'

export interface AgentWalletOptions {
  apiKey?: string
  name?: string
  chainId?: number
  spendingLimit?: {
    daily?: string
    perTx?: string
  }
}

export class AgentWallet {
  private apiKey: string
  private walletAddress: string | null = null
  private agentId: string | null = null

  private constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Create a new agent wallet on Base.
   * Deploys an ERC-4337 smart contract wallet and registers it with AgentPay.
   */
  static async create(config: WalletConfig): Promise<AgentWallet> {
    // TODO: call AgentPay API to deploy wallet
    throw new Error('AgentWallet.create() — not yet implemented. SDK is in development.')
  }

  /**
   * Load an existing agent wallet by API key.
   */
  static fromKey(apiKey: string): AgentWallet {
    return new AgentWallet(apiKey)
  }

  /**
   * Send a USDC payment from this agent wallet.
   */
  async pay(request: PaymentRequest): Promise<PaymentResponse> {
    // TODO: submit UserOperation via bundler, settle on Base
    throw new Error('AgentWallet.pay() — not yet implemented. SDK is in development.')
  }

  /**
   * Get the current USDC balance of this agent wallet.
   */
  async getBalance(): Promise<string> {
    // TODO: read USDC balance from Base
    throw new Error('AgentWallet.getBalance() — not yet implemented. SDK is in development.')
  }

  /**
   * Get the wallet's on-chain address.
   */
  getAddress(): string | null {
    return this.walletAddress
  }
}

export type { WalletConfig, PaymentRequest, PaymentResponse, CreateWalletResponse }
