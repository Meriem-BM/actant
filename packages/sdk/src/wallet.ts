import {
  createPublicClient,
  createWalletClient,
  formatEther,
  formatUnits,
  http,
  isAddress,
  isHash,
  keccak256,
  parseEther,
  parseUnits,
  toHex,
  type Account,
  type Chain,
} from 'viem'
import { base, baseSepolia } from 'viem/chains'
import type {
  AgentManifest,
  AgentRecord,
  CreateWalletResponse,
  PaymentRequest,
  PaymentResponse,
  UserOperation,
  WalletConfig,
} from '@agentpay/shared'
import { SUPPORTED_CHAINS, USDC_ADDRESSES } from '@agentpay/shared'
import {
  AGENT_REGISTRY_ABI,
  AGENT_WALLET_ABI,
  AGENT_WALLET_FACTORY_ABI,
  ERC20_ABI,
} from './abis'
import {
  encodePayCallData,
  ENTRY_POINT,
  ENTRY_POINT_ABI,
  estimateUserOpGas,
  getUserOpHash,
  sendUserOperation,
  signUserOp,
  waitForUserOpReceipt,
} from './bundler'
import { AgentLogger } from './logger'
import { buildManifest, computeAgentId, hashManifest } from './manifest'
import { createX402Fetch } from './x402'

const DEFAULT_CHAIN_ID = SUPPORTED_CHAINS.BASE_SEPOLIA
const DEFAULT_DAILY_LIMIT = '50.00'
const DEFAULT_PER_TX_LIMIT = '5.00'
const DEFAULT_MAX_FEE_PER_GAS = 100_000_000n
const DEFAULT_MAX_PRIORITY_FEE_PER_GAS = 1_000_000n
const GAS_BUFFER_MULTIPLIER = 120n
const GAS_BUFFER_DIVISOR = 100n
const USDC_DECIMALS = 6
const ZERO_LOG_HASH = `0x${'0'.repeat(64)}` as `0x${string}`
const PAYMENT_SENT_TOPIC = keccak256(
  toHex('PaymentSent(address,uint256,string,bytes32)'),
)

type Hex = `0x${string}`
type Address = `0x${string}`
type Bytes32 = `0x${string}`

type WriteContractParams = {
  address: Address
  abi: readonly unknown[]
  functionName: string
  args?: readonly unknown[]
  chain?: Chain
  value?: bigint
}

type SendTransactionParams = {
  to: Address
  value: bigint
  chain?: Chain
}

type SignMessageParams = {
  account: Address
  message: { raw: Hex }
}

export interface WalletClientLike {
  writeContract(params: WriteContractParams): Promise<Address>
  sendTransaction(params: SendTransactionParams): Promise<Address>
  signMessage?: (params: SignMessageParams) => Promise<Address>
}

export interface ActantClientConfig {
  account: Account
  chainId?: number
  rpcUrl?: string
  factory: Address
  registry: Address
  bundlerUrl?: string
  externalWalletClient?: WalletClientLike
}

type WalletInit = {
  walletAddress: Address
  agentId: Bytes32
  manifest: AgentManifest
  publicClient: ReturnType<typeof createPublicClient>
  walletClient: WalletClientLike
  usdcAddress: Address
  registryAddr: Address
  chain: Chain
  account: Account
  chainId: number
  bundlerUrl?: string
}

type ClientContext = {
  chainId: number
  chain: Chain
  publicClient: ReturnType<typeof createPublicClient>
  walletClient: WalletClientLike
  usdcAddress: Address
}

function toUSDC(amount: string): bigint {
  return parseUnits(amount, USDC_DECIMALS)
}

function fromUSDC(rawAmount: bigint): string {
  return formatUnits(rawAmount, USDC_DECIMALS)
}

function getChain(chainId: number): Chain {
  return chainId === SUPPORTED_CHAINS.BASE_MAINNET ? base : baseSepolia
}

function resolveRpcUrl(chain: Chain, customRpcUrl?: string): string {
  return customRpcUrl ?? chain.rpcUrls.default.http[0]
}

function assertAddress(value: string, field: string): asserts value is Address {
  if (!isAddress(value)) {
    throw new Error(`Invalid ${field} address: ${value}`)
  }
}

function assertBytes32(value: string, field: string): asserts value is Bytes32 {
  if (!isHash(value)) {
    throw new Error(`Invalid ${field} bytes32 hash: ${value}`)
  }
}

function createClientContext(config: ActantClientConfig): ClientContext {
  const chainId = config.chainId ?? DEFAULT_CHAIN_ID
  const chain = getChain(chainId)
  const rpcUrl = resolveRpcUrl(chain, config.rpcUrl)

  const usdcAddress = USDC_ADDRESSES[chainId]
  if (!usdcAddress) {
    throw new Error(`Unsupported chainId: ${chainId}`)
  }

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })

  const walletClient =
    config.externalWalletClient ??
    (createWalletClient({
      chain,
      transport: http(rpcUrl),
      account: config.account,
    }) as unknown as WalletClientLike)

  if (
    typeof walletClient.writeContract !== 'function' ||
    typeof walletClient.sendTransaction !== 'function'
  ) {
    throw new Error(
      'Invalid wallet client: writeContract and sendTransaction are required',
    )
  }

  return {
    chainId,
    chain,
    publicClient,
    walletClient,
    usdcAddress,
  }
}

export class AgentWallet {
  readonly walletAddress: Address
  readonly agentId: Bytes32
  readonly manifest: AgentManifest
  readonly logger: AgentLogger

  private publicClient: ReturnType<typeof createPublicClient>
  private walletClient: WalletClientLike
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

    const dailyLimit = config.spendingLimit?.daily ?? DEFAULT_DAILY_LIMIT
    const perTxLimit = config.spendingLimit?.perTx ?? DEFAULT_PER_TX_LIMIT

    const manifest = buildManifest({
      agentId,
      name: config.name,
      description: `Autonomous agent: ${config.name}`,
      operator,
      wallet: predictedWallet,
      chainId,
      config,
    })

    const txHash = await walletClient.writeContract({
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
    })

    await AgentWallet.waitForSuccessReceipt(publicClient, txHash, 'AgentWallet.create')

    const walletAddress = (await publicClient.readContract({
      address: client.factory,
      abi: AGENT_WALLET_FACTORY_ABI,
      functionName: 'wallets',
      args: [agentId],
    })) as Address

    const allowedRecipients = config.allowedRecipients ?? []
    for (const recipient of allowedRecipients) {
      assertAddress(recipient, 'allowed recipient')
      const allowTx = await walletClient.writeContract({
        address: walletAddress,
        abi: AGENT_WALLET_ABI,
        functionName: 'allowRecipient',
        args: [recipient],
        chain,
      })
      await AgentWallet.waitForSuccessReceipt(
        publicClient,
        allowTx,
        'AgentWallet.create.allowRecipient',
      )
    }

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
    assertAddress(agentId, 'agentId')
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
    if (request.currency !== 'USDC') {
      throw new Error(`Unsupported currency: ${request.currency}`)
    }

    if (!isAddress(request.to)) {
      throw new Error(`Invalid payment recipient address: ${request.to}`)
    }

    const to = request.to as Address
    const amount = toUSDC(request.amount)
    const memo = request.memo ?? ''

    const txHash = this.bundlerUrl
      ? await this.sendViaUserOperation(encodePayCallData(to, amount, memo))
      : await this.walletClient.writeContract({
          address: this.walletAddress,
          abi: AGENT_WALLET_ABI,
          functionName: 'pay',
          args: [to, amount, memo],
          chain: this.chain,
        })

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash })
    if (receipt.status !== 'success') {
      throw new Error(`AgentWallet.pay: transaction reverted — ${txHash}`)
    }

    const logHash = this.extractPaymentLogHash(receipt.logs) ?? ZERO_LOG_HASH
    const timestamp = new Date()

    this.logger.logPayment({
      to,
      amount: request.amount,
      currency: 'USDC',
      memo,
      txHash,
      blockNumber: Number(receipt.blockNumber),
      success: true,
      logHash,
    })

    return {
      hash: txHash,
      status: 'confirmed',
      amount: request.amount,
      to,
      timestamp,
      logHash,
    }
  }

  async depositGas(amountEth: string): Promise<Address> {
    const txHash = await this.walletClient.sendTransaction({
      to: this.walletAddress,
      value: parseEther(amountEth),
      chain: this.chain,
    })
    await this.waitForTransaction(txHash, 'AgentWallet.depositGas')
    this.logger.logDecision(`Gas funded: ${amountEth} ETH`)
    return txHash
  }

  async depositToEntryPoint(amountEth: string): Promise<Address> {
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

  async pause(): Promise<Address> {
    const txHash = await this.writeRegistry('pauseAgent', [this.agentId])
    this.logger.logDecision('Agent paused in registry')
    return txHash
  }

  async resume(): Promise<Address> {
    const txHash = await this.writeRegistry('resumeAgent', [this.agentId])
    this.logger.logDecision('Agent resumed in registry')
    return txHash
  }

  async revoke(): Promise<Address> {
    const txHash = await this.writeRegistry('revokeAgent', [this.agentId])
    this.logger.logDecision('Agent permanently revoked in registry')
    return txHash
  }

  async updateManifest(newManifestHash: Bytes32): Promise<Address> {
    assertBytes32(newManifestHash, 'manifest hash')
    const txHash = await this.writeRegistry('updateManifest', [
      this.agentId,
      newManifestHash,
    ])
    this.logger.logDecision(`Manifest updated: ${newManifestHash}`)
    return txHash
  }

  async updateLimits(dailyLimit: string, perTxLimit: string): Promise<Address> {
    const txHash = await this.writeWallet('updateLimits', [
      toUSDC(dailyLimit),
      toUSDC(perTxLimit),
    ])
    this.logger.logDecision(
      `Limits updated: daily ${dailyLimit} USDC, per-tx ${perTxLimit} USDC`,
    )
    return txHash
  }

  async allowRecipient(recipient: Address): Promise<Address> {
    assertAddress(recipient, 'recipient')
    const txHash = await this.writeWallet('allowRecipient', [recipient])
    this.logger.logDecision(`Allowlist added: ${recipient}`)
    return txHash
  }

  async blockRecipient(recipient: Address): Promise<Address> {
    assertAddress(recipient, 'recipient')
    const txHash = await this.writeWallet('blockRecipient', [recipient])
    this.logger.logDecision(`Allowlist blocked: ${recipient}`)
    return txHash
  }

  async disableAllowlist(): Promise<Address> {
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

  private async writeWallet(
    functionName: string,
    args: readonly unknown[] = [],
  ): Promise<Address> {
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
  ): Promise<Address> {
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
  }): Promise<Address> {
    const txHash = await this.walletClient.writeContract({
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args,
      value: params.value,
      chain: this.chain,
    })

    await this.waitForTransaction(txHash, params.context)
    return txHash
  }

  private async waitForTransaction(txHash: Address, context: string): Promise<void> {
    await AgentWallet.waitForSuccessReceipt(this.publicClient, txHash, context)
  }

  private async sendViaUserOperation(callData: Address): Promise<Address> {
    if (!this.bundlerUrl) {
      throw new Error('Bundler URL is required for UserOperation flow')
    }

    const nonce = (await this.publicClient.readContract({
      address: ENTRY_POINT,
      abi: ENTRY_POINT_ABI,
      functionName: 'getNonce',
      args: [this.walletAddress, 0n],
    })) as bigint

    const feeData = await this.publicClient.estimateFeesPerGas()

    const partial: UserOperation = {
      sender: this.walletAddress,
      nonce,
      initCode: '0x',
      callData,
      callGasLimit: 200_000n,
      verificationGasLimit: 200_000n,
      preVerificationGas: 50_000n,
      maxFeePerGas: feeData.maxFeePerGas ?? DEFAULT_MAX_FEE_PER_GAS,
      maxPriorityFeePerGas:
        feeData.maxPriorityFeePerGas ?? DEFAULT_MAX_PRIORITY_FEE_PER_GAS,
      paymasterAndData: '0x',
      signature: '0x',
    }

    const estimatedGas = await estimateUserOpGas(this.bundlerUrl, partial)

    const finalOp: UserOperation = {
      ...partial,
      callGasLimit:
        (estimatedGas.callGasLimit * GAS_BUFFER_MULTIPLIER) / GAS_BUFFER_DIVISOR,
      verificationGasLimit:
        (estimatedGas.verificationGasLimit * GAS_BUFFER_MULTIPLIER) /
        GAS_BUFFER_DIVISOR,
      preVerificationGas:
        (estimatedGas.preVerificationGas * GAS_BUFFER_MULTIPLIER) /
        GAS_BUFFER_DIVISOR,
    }

    finalOp.signature = await this.signUserOperation(finalOp)

    const userOpHash = await sendUserOperation(this.bundlerUrl, finalOp)
    const receipt = await waitForUserOpReceipt(this.bundlerUrl, userOpHash)

    return receipt.receipt.transactionHash
  }

  private async signUserOperation(userOp: UserOperation): Promise<Address> {
    if (this.account.signMessage) {
      return signUserOp(userOp, this.account, this.chainId)
    }

    if (this.walletClient.signMessage) {
      const hash = getUserOpHash(userOp, this.chainId)
      return this.walletClient.signMessage({
        account: this.account.address,
        message: { raw: hash },
      })
    }

    throw new Error('Connected wallet client cannot sign UserOperations')
  }

  private extractPaymentLogHash(
    logs: readonly { topics: readonly Address[]; data: Address }[],
  ): Address | null {
    for (const log of logs) {
      if (log.topics[0] !== PAYMENT_SENT_TOPIC) {
        continue
      }

      const dataHex = log.data.slice(2)
      if (dataHex.length < 192) {
        continue
      }

      return `0x${dataHex.slice(128, 192)}` as Address
    }

    return null
  }

  private static async waitForSuccessReceipt(
    publicClient: ReturnType<typeof createPublicClient>,
    txHash: Address,
    context: string,
  ): Promise<void> {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    if (receipt.status !== 'success') {
      throw new Error(`${context}: transaction reverted — ${txHash}`)
    }
  }
}
