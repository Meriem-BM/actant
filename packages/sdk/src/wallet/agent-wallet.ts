import { formatEther, parseEther, type Account, type Chain } from 'viem'
import type {
  AgentManifest,
  AgentRecord,
  CreateWalletResponse,
  PaymentRequest,
  PaymentResponse,
  WalletConfig,
} from '@actant/shared'
import {
  AGENT_REGISTRY_ABI,
  AGENT_WALLET_ABI,
  AGENT_WALLET_FACTORY_ABI,
  ERC20_ABI,
} from '../abis'
import { encodePayCallData, ENTRY_POINT, ENTRY_POINT_ABI } from '../bundler'
import { AgentLogger } from '../logger'
import { buildManifest, computeAgentId, hashManifest } from '../manifest'
import { createX402Fetch } from '../x402'
import { ZERO_LOG_HASH } from './constants'
import {
  assertAddress,
  assertBytes32,
  configureAllowedRecipients,
  createClientContext,
  extractPaymentLogHash,
  fromUSDC,
  normalizePaymentInput,
  resolveSpendingLimits,
  toUSDC,
} from './helpers'
import {
  waitForSuccessReceipt,
  waitForTransactionReceiptWithRetry,
} from './receipts'
import { sendViaUserOperation as sendUserOperationTx } from './user-operation'
import type {
  ActantClientConfig,
  Address,
  Bytes32,
  ClientContext,
  Hex,
  PaymentInput,
  TxHash,
  WalletInit,
} from './types'

export class AgentWallet {
  readonly walletAddress: Address
  readonly agentId: Bytes32
  readonly manifest: AgentManifest
  readonly logger: AgentLogger

  private publicClient: ClientContext['publicClient']
  private walletClient: ClientContext['walletClient']
  private usdcAddress: Address
  private registryAddr: Address
  private chain: Chain
  private account: Account
  private chainId: number
  private bundlerUrl?: string

  private constructor(params: WalletInit) {
    this.walletAddress = params.walletAddress
    this.agentId = params.agentId
    this.manifest = params.manifest
    this.publicClient = params.publicClient
    this.walletClient = params.walletClient
    this.usdcAddress = params.usdcAddress
    this.registryAddr = params.registryAddr
    this.chain = params.chain
    this.account = params.account
    this.chainId = params.chainId
    this.bundlerUrl = params.bundlerUrl

    this.logger = new AgentLogger({
      agentId: params.agentId,
      agentName: params.manifest.name,
    })
  }

  static async create(
    config: WalletConfig,
    client: ActantClientConfig,
  ): Promise<{ wallet: AgentWallet; response: CreateWalletResponse }> {
    assertAddress(client.factory, 'factory')
    assertAddress(client.registry, 'registry')

    const { chainId, chain, publicClient, walletClient, usdcAddress } =
      createClientContext(client)

    const operator = client.account.address
    const agentId = computeAgentId(config.name, operator) as Bytes32

    const predictedWallet = (await publicClient.readContract({
      address: client.factory,
      abi: AGENT_WALLET_FACTORY_ABI,
      functionName: 'getWalletAddress',
      args: [agentId, operator],
    })) as Address

    const { dailyLimit, perTxLimit } = resolveSpendingLimits(config)

    const manifest = buildManifest({
      agentId,
      name: config.name,
      description: `Autonomous agent: ${config.name}`,
      operator,
      wallet: predictedWallet,
      chainId,
      config,
    })

    const txHash = (await walletClient.writeContract({
      address: client.factory,
      abi: AGENT_WALLET_FACTORY_ABI,
      functionName: 'createWallet',
      args: [
        agentId,
        operator,
        toUSDC(dailyLimit),
        toUSDC(perTxLimit),
        hashManifest(manifest),
      ],
      chain,
    })) as TxHash

    await waitForSuccessReceipt(publicClient, txHash, 'AgentWallet.create')

    const walletAddress = (await publicClient.readContract({
      address: client.factory,
      abi: AGENT_WALLET_FACTORY_ABI,
      functionName: 'wallets',
      args: [agentId],
    })) as Address

    await configureAllowedRecipients({
      recipients: config.allowedRecipients ?? [],
      walletAddress,
      chain,
      publicClient,
      walletClient,
    })

    const wallet = new AgentWallet({
      walletAddress,
      agentId,
      manifest,
      publicClient,
      walletClient,
      usdcAddress,
      registryAddr: client.registry,
      chain,
      account: client.account,
      chainId,
      bundlerUrl: client.bundlerUrl,
    })

    const response: CreateWalletResponse = {
      walletAddress,
      agentId,
      txHash,
      manifest,
    }

    return { wallet, response }
  }

  static fromAddress(
    walletAddress: Address,
    agentId: Bytes32,
    manifest: AgentManifest,
    client: ActantClientConfig,
  ): AgentWallet {
    assertAddress(walletAddress, 'walletAddress')
    assertBytes32(agentId, 'agentId')
    assertAddress(client.registry, 'registry')

    const { chainId, chain, publicClient, walletClient, usdcAddress } =
      createClientContext(client)

    return new AgentWallet({
      walletAddress,
      agentId,
      manifest,
      publicClient,
      walletClient,
      usdcAddress,
      registryAddr: client.registry,
      chain,
      account: client.account,
      chainId,
      bundlerUrl: client.bundlerUrl,
    })
  }

  async pay(request: PaymentRequest): Promise<PaymentResponse> {
    const payment = normalizePaymentInput(request)
    const txHash = await this.submitPayment(payment)

    const receipt = await waitForTransactionReceiptWithRetry(
      this.publicClient,
      txHash,
      'AgentWallet.pay',
    )
    if (receipt.status !== 'success') {
      throw new Error(`AgentWallet.pay: transaction reverted — ${txHash}`)
    }

    const logHash = extractPaymentLogHash(receipt.logs) ?? ZERO_LOG_HASH
    const timestamp = new Date()

    this.logger.logPayment({
      to: payment.to,
      amount: payment.amountRaw,
      currency: 'USDC',
      memo: payment.memo,
      txHash,
      blockNumber: Number(receipt.blockNumber),
      success: true,
      logHash,
    })

    return {
      hash: txHash,
      status: 'confirmed',
      amount: payment.amountRaw,
      to: payment.to,
      timestamp,
      logHash,
    }
  }

  async depositGas(amountEth: string): Promise<TxHash> {
    const txHash = (await this.walletClient.sendTransaction({
      to: this.walletAddress,
      value: parseEther(amountEth),
      chain: this.chain,
    })) as TxHash
    await this.waitForTransaction(txHash, 'AgentWallet.depositGas')
    this.logger.logDecision(`Gas funded: ${amountEth} ETH`)
    return txHash
  }

  async depositToEntryPoint(amountEth: string): Promise<TxHash> {
    const txHash = await this.writeContractAndWait({
      address: ENTRY_POINT,
      abi: ENTRY_POINT_ABI,
      functionName: 'depositTo',
      args: [this.walletAddress],
      value: parseEther(amountEth),
      context: 'AgentWallet.depositToEntryPoint',
    })
    this.logger.logDecision(`EntryPoint deposit: ${amountEth} ETH`)
    return txHash
  }

  async getEthBalance(): Promise<string> {
    const raw = await this.publicClient.getBalance({ address: this.walletAddress })
    return formatEther(raw)
  }

  async getEntryPointDeposit(): Promise<string> {
    const raw = (await this.publicClient.readContract({
      address: ENTRY_POINT,
      abi: ENTRY_POINT_ABI,
      functionName: 'balanceOf',
      args: [this.walletAddress],
    })) as bigint
    return formatEther(raw)
  }

  async getBalance(): Promise<string> {
    const raw = (await this.publicClient.readContract({
      address: this.usdcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [this.walletAddress],
    })) as bigint

    return fromUSDC(raw)
  }

  async getDailySpent(): Promise<string> {
    const raw = (await this.publicClient.readContract({
      address: this.walletAddress,
      abi: AGENT_WALLET_ABI,
      functionName: 'dailySpent',
    })) as bigint

    return fromUSDC(raw)
  }

  async isActive(): Promise<boolean> {
    return (await this.publicClient.readContract({
      address: this.registryAddr,
      abi: AGENT_REGISTRY_ABI,
      functionName: 'isActive',
      args: [this.agentId],
    })) as boolean
  }

  async getOnChainRecord(): Promise<AgentRecord> {
    return (await this.publicClient.readContract({
      address: this.registryAddr,
      abi: AGENT_REGISTRY_ABI,
      functionName: 'getAgent',
      args: [this.agentId],
    })) as AgentRecord
  }

  async pause(): Promise<TxHash> {
    const txHash = await this.writeRegistry('pauseAgent', [this.agentId])
    this.logger.logDecision('Agent paused in registry')
    return txHash
  }

  async resume(): Promise<TxHash> {
    const txHash = await this.writeRegistry('resumeAgent', [this.agentId])
    this.logger.logDecision('Agent resumed in registry')
    return txHash
  }

  async revoke(): Promise<TxHash> {
    const txHash = await this.writeRegistry('revokeAgent', [this.agentId])
    this.logger.logDecision('Agent permanently revoked in registry')
    return txHash
  }

  async updateManifest(newManifestHash: Bytes32): Promise<TxHash> {
    assertBytes32(newManifestHash, 'manifest hash')
    const txHash = await this.writeRegistry('updateManifest', [
      this.agentId,
      newManifestHash,
    ])
    this.logger.logDecision(`Manifest updated: ${newManifestHash}`)
    return txHash
  }

  async updateLimits(dailyLimit: string, perTxLimit: string): Promise<TxHash> {
    const txHash = await this.writeWallet('updateLimits', [
      toUSDC(dailyLimit),
      toUSDC(perTxLimit),
    ])
    this.logger.logDecision(
      `Limits updated: daily ${dailyLimit} USDC, per-tx ${perTxLimit} USDC`,
    )
    return txHash
  }

  async allowRecipient(recipient: Address): Promise<TxHash> {
    assertAddress(recipient, 'recipient')
    const txHash = await this.writeWallet('allowRecipient', [recipient])
    this.logger.logDecision(`Allowlist added: ${recipient}`)
    return txHash
  }

  async blockRecipient(recipient: Address): Promise<TxHash> {
    assertAddress(recipient, 'recipient')
    const txHash = await this.writeWallet('blockRecipient', [recipient])
    this.logger.logDecision(`Allowlist blocked: ${recipient}`)
    return txHash
  }

  async disableAllowlist(): Promise<TxHash> {
    const txHash = await this.writeWallet('disableAllowlist')
    this.logger.logDecision('Allowlist disabled')
    return txHash
  }

  getX402Fetch() {
    return createX402Fetch({
      onPaymentRequired: async (required) => {
        const response = await this.pay({
          to: required.payTo,
          amount: required.amount,
          currency: 'USDC',
          memo: `x402: ${required.resource}`,
        })

        return {
          txHash: response.hash,
          amount: required.amount,
        }
      },
      onPaymentSuccess: (required, txHash) => {
        this.logger.logDecision(
          `x402 payment: ${required.amount} USDC to ${required.payTo} (${txHash})`,
        )
      },
    })
  }

  private async submitPayment(payment: PaymentInput): Promise<TxHash> {
    if (this.bundlerUrl) {
      return this.sendViaUserOperation(
        encodePayCallData(payment.to, payment.amount, payment.memo),
      )
    }

    return (await this.walletClient.writeContract({
      address: this.walletAddress,
      abi: AGENT_WALLET_ABI,
      functionName: 'pay',
      args: [payment.to, payment.amount, payment.memo],
      chain: this.chain,
    })) as TxHash
  }

  private async writeWallet(
    functionName: string,
    args: readonly unknown[] = [],
  ): Promise<TxHash> {
    return this.writeContractAndWait({
      address: this.walletAddress,
      abi: AGENT_WALLET_ABI,
      functionName,
      args,
      context: `AgentWallet.${functionName}`,
    })
  }

  private async writeRegistry(
    functionName: string,
    args: readonly unknown[] = [],
  ): Promise<TxHash> {
    return this.writeContractAndWait({
      address: this.registryAddr,
      abi: AGENT_REGISTRY_ABI,
      functionName,
      args,
      context: `AgentWallet.${functionName}`,
    })
  }

  private async writeContractAndWait(params: {
    address: Address
    abi: readonly unknown[]
    functionName: string
    args?: readonly unknown[]
    value?: bigint
    context: string
  }): Promise<TxHash> {
    const txHash = (await this.walletClient.writeContract({
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args,
      value: params.value,
      chain: this.chain,
    })) as TxHash

    await this.waitForTransaction(txHash, params.context)
    return txHash
  }

  private async waitForTransaction(txHash: TxHash, context: string): Promise<void> {
    await waitForSuccessReceipt(this.publicClient, txHash, context)
  }

  private async sendViaUserOperation(callData: Hex): Promise<TxHash> {
    if (!this.bundlerUrl) {
      throw new Error('Bundler URL is required for UserOperation flow')
    }

    return sendUserOperationTx({
      bundlerUrl: this.bundlerUrl,
      publicClient: this.publicClient,
      walletAddress: this.walletAddress,
      account: this.account,
      walletClient: this.walletClient,
      chainId: this.chainId,
      callData,
    })
  }
}
