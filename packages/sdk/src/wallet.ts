import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  keccak256,
  toHex,
  type PublicClient,
  type Account,
  type Chain,
} from 'viem'
import { baseSepolia, base } from 'viem/chains'
import type {
  WalletConfig,
  CreateWalletResponse,
  PaymentRequest,
  PaymentResponse,
  AgentManifest,
} from '@agentpay/shared'
import { USDC_ADDRESSES, CONTRACT_ADDRESSES, SUPPORTED_CHAINS } from '@agentpay/shared'
import {
  AGENT_WALLET_ABI,
  AGENT_WALLET_FACTORY_ABI,
  AGENT_REGISTRY_ABI,
  ERC20_ABI,
} from './abis'
import { AgentLogger } from './logger'
import { buildManifest, hashManifest, computeAgentId } from './manifest'
import { createX402Fetch } from './x402'

const USDC_DECIMALS = 6

// keccak256("PaymentSent(address,uint256,string,bytes32)")
// Pre-computed so _extractLogHash doesn't recompute on every call.
const PAYMENT_SENT_TOPIC = keccak256(toHex('PaymentSent(address,uint256,string,bytes32)'))

function toUSDC(human: string): bigint {
  return parseUnits(human, USDC_DECIMALS)
}

function fromUSDC(raw: bigint): string {
  return formatUnits(raw, USDC_DECIMALS)
}

function getChain(chainId: number): Chain {
  return chainId === SUPPORTED_CHAINS.BASE_MAINNET ? base : baseSepolia
}

export interface ActantClientConfig {
  /** Signer account (viem Account or private key hex string) */
  account:    Account
  /** Chain ID — defaults to Base Sepolia (84532) */
  chainId?:   number
  /** Custom RPC URL — defaults to public Base RPC */
  rpcUrl?:    string
  /** Deployed AgentWalletFactory address */
  factory:    `0x${string}`
  /** Deployed AgentRegistry address */
  registry:   `0x${string}`
}

/**
 * AgentWallet — the core SDK class for managing Actant execution accounts.
 *
 * Each AgentWallet instance represents a single deployed ERC-4337 smart contract
 * account linked to an ERC-8004 identity in AgentRegistry.
 *
 * @example
 * // Create a new agent wallet
 * const wallet = await AgentWallet.create({
 *   name: 'trading-bot',
 *   spendingLimit: { daily: '50.00', perTx: '5.00' },
 * }, client)
 *
 * // Pay from the agent wallet
 * const tx = await wallet.pay({
 *   to: '0xRecipient',
 *   amount: '0.04',
 *   currency: 'USDC',
 *   memo: 'openai-api-call',
 * })
 */
export class AgentWallet {
  readonly walletAddress: `0x${string}`
  readonly agentId:       `0x${string}`
  readonly manifest:      AgentManifest
  readonly logger:        AgentLogger

  private publicClient:  PublicClient
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private walletClient:  any
  private usdcAddress:   `0x${string}`
  private registryAddr:  `0x${string}`
  private chain:         Chain

  private constructor(params: {
    walletAddress: `0x${string}`
    agentId:       `0x${string}`
    manifest:      AgentManifest
    publicClient:  PublicClient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    walletClient:  any
    usdcAddress:   `0x${string}`
    registryAddr:  `0x${string}`
    chain:         Chain
  }) {
    this.walletAddress  = params.walletAddress
    this.agentId        = params.agentId
    this.manifest       = params.manifest
    this.publicClient   = params.publicClient
    this.walletClient   = params.walletClient
    this.usdcAddress    = params.usdcAddress
    this.registryAddr   = params.registryAddr
    this.chain          = params.chain
    this.logger = new AgentLogger({
      agentId:   params.agentId,
      agentName: params.manifest.name,
    })
  }

  // ─── Static: create ─────────────────────────────────────────────────────────

  /**
   * Deploy a new agent wallet and register it in AgentRegistry (ERC-8004).
   * This is a single transaction that atomically:
   * 1. Deploys the ERC-4337 execution account
   * 2. Registers the agent identity in AgentRegistry
   *
   * If `config.allowedRecipients` is set, each address is added to the
   * on-chain allowlist via follow-up transactions after deployment.
   */
  static async create(
    config: WalletConfig,
    client: ActantClientConfig,
  ): Promise<{ wallet: AgentWallet; response: CreateWalletResponse }> {
    const chainId  = client.chainId ?? SUPPORTED_CHAINS.BASE_SEPOLIA
    const chain    = getChain(chainId)
    const usdcAddr = USDC_ADDRESSES[chainId]

    const publicClient = createPublicClient({
      chain,
      transport: http(client.rpcUrl),
    })
    const walletClient = createWalletClient({
      chain,
      transport: http(client.rpcUrl),
      account:   client.account,
    })

    const operator = client.account.address
    const agentId  = computeAgentId(config.name, operator) as `0x${string}`

    // Pre-compute the deterministic wallet address so the manifest hash
    // committed on-chain matches the manifest returned to the caller.
    // (Computing the hash after mutating manifest.wallet would break ERC-8004 verification.)
    const predictedWallet = await publicClient.readContract({
      address:      client.factory,
      abi:          AGENT_WALLET_FACTORY_ABI,
      functionName: 'getWalletAddress',
      args:         [agentId, operator],
    }) as `0x${string}`

    const manifest = buildManifest({
      agentId,
      name:        config.name,
      description: `Autonomous agent: ${config.name}`,
      operator,
      wallet:      predictedWallet,
      chainId,
      config,
    })
    const manifestHash = hashManifest(manifest)

    const dailyLimitRaw = toUSDC(config.spendingLimit?.daily ?? '50.00')
    const perTxLimitRaw = toUSDC(config.spendingLimit?.perTx ?? '5.00')

    // Deploy + register atomically via factory
    const txHash = await walletClient.writeContract({
      address:      client.factory,
      abi:          AGENT_WALLET_FACTORY_ABI,
      functionName: 'createWallet',
      args:         [agentId, operator, dailyLimitRaw, perTxLimitRaw, manifestHash],
      chain,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    if (receipt.status !== 'success') {
      throw new Error(`AgentWallet.create: transaction reverted — ${txHash}`)
    }

    const walletAddr = await publicClient.readContract({
      address:      client.factory,
      abi:          AGENT_WALLET_FACTORY_ABI,
      functionName: 'wallets',
      args:         [agentId],
    }) as `0x${string}`

    // Apply allowlist if configured — separate transactions after deployment
    if (config.allowedRecipients && config.allowedRecipients.length > 0) {
      for (const recipient of config.allowedRecipients) {
        const allowTx = await walletClient.writeContract({
          address:      walletAddr,
          abi:          AGENT_WALLET_ABI,
          functionName: 'allowRecipient',
          args:         [recipient],
          chain,
        })
        await publicClient.waitForTransactionReceipt({ hash: allowTx })
      }
    }

    const response: CreateWalletResponse = {
      walletAddress: walletAddr,
      agentId,
      txHash,
      manifest,
    }

    const wallet = new AgentWallet({
      walletAddress: walletAddr,
      agentId,
      manifest,
      publicClient,
      walletClient,
      usdcAddress:  usdcAddr,
      registryAddr: client.registry,
      chain,
    })

    return { wallet, response }
  }

  /**
   * Load an existing agent wallet by address (no deployment).
   */
  static fromAddress(
    walletAddress: `0x${string}`,
    agentId:       `0x${string}`,
    manifest:      AgentManifest,
    client:        ActantClientConfig,
  ): AgentWallet {
    const chainId = client.chainId ?? SUPPORTED_CHAINS.BASE_SEPOLIA
    const chain   = getChain(chainId)

    const publicClient = createPublicClient({
      chain,
      transport: http(client.rpcUrl),
    })
    const walletClient = createWalletClient({
      chain,
      transport: http(client.rpcUrl),
      account:   client.account,
    })

    return new AgentWallet({
      walletAddress,
      agentId,
      manifest,
      publicClient,
      walletClient,
      usdcAddress:  USDC_ADDRESSES[chainId],
      registryAddr: client.registry,
      chain,
    })
  }

  // ─── pay ─────────────────────────────────────────────────────────────────────

  /**
   * Send a USDC payment from this agent wallet.
   *
   * Throws if the transaction is mined but reverted (e.g. limits changed,
   * agent paused, or balance insufficient after broadcast).
   */
  async pay(request: PaymentRequest): Promise<PaymentResponse> {
    const to     = request.to as `0x${string}`
    const amount = toUSDC(request.amount)
    const memo   = request.memo ?? ''

    const txHash = await this.walletClient.writeContract({
      address:      this.walletAddress,
      abi:          AGENT_WALLET_ABI,
      functionName: 'pay',
      args:         [to, amount, memo],
      chain:        this.chain,
    })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash })

    if (receipt.status !== 'success') {
      throw new Error(`AgentWallet.pay: transaction reverted — ${txHash}`)
    }

    const timestamp = new Date()

    // Extract the logHash from the PaymentSent event.
    // The event is identified by its topic signature to avoid reading the wrong
    // log (USDC emits a Transfer event before PaymentSent in the same tx).
    const logHash = this._extractLogHash(receipt.logs) ?? `0x${'0'.repeat(64)}` as `0x${string}`

    // Log locally using the same logHash that was committed on-chain,
    // so off-chain entries can be verified against AgentRegistry.
    this.logger.logPayment({
      to,
      amount:      request.amount,
      currency:    'USDC',
      memo,
      txHash,
      blockNumber: Number(receipt.blockNumber),
      success:     true,
      logHash,
    })

    return {
      hash:      txHash,
      status:    'confirmed' as const,
      amount:    request.amount,
      to,
      timestamp,
      logHash,
    }
  }

  // ─── getBalance ──────────────────────────────────────────────────────────────

  /** Get the current USDC balance of this agent wallet (human-readable). */
  async getBalance(): Promise<string> {
    const raw = await this.publicClient.readContract({
      address:      this.usdcAddress,
      abi:          ERC20_ABI,
      functionName: 'balanceOf',
      args:         [this.walletAddress],
    }) as bigint

    return fromUSDC(raw)
  }

  /** Get how much USDC has been spent today (human-readable). */
  async getDailySpent(): Promise<string> {
    const raw = await this.publicClient.readContract({
      address:      this.walletAddress,
      abi:          AGENT_WALLET_ABI,
      functionName: 'dailySpent',
    }) as bigint

    return fromUSDC(raw)
  }

  // ─── Registry reads ──────────────────────────────────────────────────────────

  /** Check if this agent is active in the registry. */
  async isActive(): Promise<boolean> {
    return await this.publicClient.readContract({
      address:      this.registryAddr,
      abi:          AGENT_REGISTRY_ABI,
      functionName: 'isActive',
      args:         [this.agentId],
    }) as boolean
  }

  /** Get the on-chain ERC-8004 record for this agent. */
  async getOnChainRecord() {
    return await this.publicClient.readContract({
      address:      this.registryAddr,
      abi:          AGENT_REGISTRY_ABI,
      functionName: 'getAgent',
      args:         [this.agentId],
    })
  }

  // ─── x402 fetch ──────────────────────────────────────────────────────────────

  /**
   * Returns a `fetch` wrapper that automatically handles HTTP 402 responses
   * by paying via this wallet and retrying the request.
   */
  getX402Fetch() {
    return createX402Fetch({
      onPaymentRequired: async (required) => {
        const resp = await this.pay({
          to:       required.payTo,
          amount:   required.amount,
          currency: 'USDC',
          memo:     `x402: ${required.resource}`,
        })
        return { txHash: resp.hash, amount: required.amount }
      },
      onPaymentSuccess: (required, txHash) => {
        console.log(`[Actant] x402 payment: ${required.amount} USDC → ${required.payTo} (${txHash})`)
      },
    })
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  /**
   * Extract the logHash from the PaymentSent event in a transaction receipt.
   *
   * PaymentSent(address indexed to, uint256 amount, string memo, bytes32 logHash)
   *
   * ABI encoding of non-indexed fields (amount, memo, logHash):
   *   word 0 (bytes  0–31): amount     (uint256, static)
   *   word 1 (bytes 32–63): memo offset (dynamic pointer)
   *   word 2 (bytes 64–95): logHash    (bytes32, static)  ← we want this
   *
   * We identify the log by matching topics[0] to the PaymentSent event signature
   * so we never accidentally read the USDC Transfer log that precedes it.
   */
  private _extractLogHash(
    logs: readonly { topics: readonly `0x${string}`[]; data: `0x${string}` }[],
  ): `0x${string}` | null {
    for (const log of logs) {
      if (log.topics[0] !== PAYMENT_SENT_TOPIC) continue

      const dataHex = log.data.slice(2) // strip 0x
      if (dataHex.length < 192) continue // need at least 3 × 32 bytes (96 bytes = 192 hex chars)

      // logHash is word 2 (bytes 64–95 = hex chars 128–191)
      return `0x${dataHex.slice(128, 192)}` as `0x${string}`
    }
    return null
  }
}
