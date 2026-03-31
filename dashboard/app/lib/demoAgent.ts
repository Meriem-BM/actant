import { createPublicClient, formatUnits, http } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import {
  AgentWallet,
  buildManifest,
  computeAgentId,
  AGENT_WALLET_FACTORY_ABI,
  SUPPORTED_CHAINS,
  type ActantClientConfig,
} from '@actant/sdk'
import { getTokenPrice, getProtocolTVL, analyzeMarketSignal, type MarketSignal } from '@/app/lib/tools'

const AGENT_NAME        = 'actant-research-agent'
const AGENT_VERSION     = '1.0.0'
const PAYMENT_AMOUNT    = '0.04'
const PAYMENT_RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as `0x${string}`
const USDC_DECIMALS     = 6
const MIN_ETH_FOR_GAS   = 0.001

type StepStatus = 'running' | 'done' | 'error'

export type AgentEvent =
  | { type: 'step'; step: number; label: string; status: StepStatus }
  | { type: 'log'; msg: string }
  | { type: 'wallet'; address: string; created: boolean; explorerUrl: string }
  | { type: 'price'; symbol: string; price: number; change: number; latency: number; success: boolean }
  | { type: 'tvl'; protocol: string; tvl: number; change: number; latency: number; success: boolean }
  | { type: 'signal'; symbol: string; price: number; signal: string; confidence: number; reason: string }
  | { type: 'payment'; amount: string; recipient: string; txHash: string; explorerUrl: string }
  | { type: 'complete'; agentId: string; operator: string; walletAddress: string; paymentTx: string; logEntries: number; signals: Array<{ symbol: string; price: number; signal: string }> }
  | { type: 'error'; msg: string }

export async function runDemoAgent(
  send: (event: AgentEvent) => void,
  clientConfig: ActantClientConfig,
) {
  const chainId = clientConfig.chainId ?? SUPPORTED_CHAINS.BASE_SEPOLIA
  const chain   = chainId === SUPPORTED_CHAINS.BASE_MAINNET ? base : baseSepolia
  const rpcUrl  = clientConfig.rpcUrl ?? 'https://sepolia.base.org'
  const bundlerUrl = clientConfig.bundlerUrl
  const explorer = chainId === SUPPORTED_CHAINS.BASE_MAINNET
    ? 'https://basescan.org'
    : 'https://sepolia.basescan.org'

  if (!clientConfig.registry) {
    send({ type: 'error', msg: 'REGISTRY_ADDRESS not set. Deploy contracts first: make deploy-sepolia' })
    return
  }

  if (!clientConfig.factory) {
    send({ type: 'error', msg: 'FACTORY_ADDRESS not set. Deploy contracts first: make deploy-sepolia' })
    return
  }

  const operator = clientConfig.account.address
  const config: ActantClientConfig = { ...clientConfig, chainId, rpcUrl }
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })

  send({ type: 'step', step: 1, label: 'BOOT', status: 'running' })

  const agentId = computeAgentId(AGENT_NAME, operator) as `0x${string}`

  send({ type: 'log', msg: `AgentId:  ${agentId}` })
  send({ type: 'log', msg: `Operator: ${operator}` })
  send({ type: 'log', msg: `Chain:    ${chainId === SUPPORTED_CHAINS.BASE_MAINNET ? 'Base Mainnet' : 'Base Sepolia'} (${chainId})` })
  send({ type: 'log', msg: `Version:  ${AGENT_VERSION}` })
  send({ type: 'log', msg: `Mode:     ${bundlerUrl ? 'ERC-4337 bundler (UserOp)' : 'Direct EOA (local dev)'}` })
  if (bundlerUrl) {
    const bundlerHost = new URL(bundlerUrl).hostname
    send({ type: 'log', msg: `Bundler:  ${bundlerHost}` })
  }

  send({ type: 'step', step: 1, label: 'BOOT', status: 'done' })

  send({ type: 'step', step: 2, label: 'CHECK', status: 'running' })

  let wallet: AgentWallet

  try {
    const existingAddr = await publicClient.readContract({
      address:      clientConfig.factory,
      abi:          AGENT_WALLET_FACTORY_ABI,
      functionName: 'wallets',
      args:         [agentId],
    }) as `0x${string}`

    const walletExists = existingAddr !== '0x0000000000000000000000000000000000000000'

    if (walletExists) {
      const manifest = buildManifest({
        agentId,
        name:        AGENT_NAME,
        version:     AGENT_VERSION,
        description: 'Autonomous DeFi research and settlement agent',
        operator,
        wallet:      existingAddr,
        chainId,
        config:      { name: AGENT_NAME, spendingLimit: { daily: '50.00', perTx: '5.00' } },
      })
      wallet = AgentWallet.fromAddress(existingAddr, agentId, manifest, config)
      send({ type: 'wallet', address: existingAddr, created: false, explorerUrl: `${explorer}/address/${existingAddr}` })
      send({ type: 'log', msg: `Loaded existing wallet: ${existingAddr}` })
    } else {
      send({ type: 'log', msg: 'No existing wallet. Deploying via AgentWalletFactory…' })
      const { wallet: deployed, response } = await AgentWallet.create(
        { name: AGENT_NAME, spendingLimit: { daily: '50.00', perTx: '5.00' } },
        config,
      )
      wallet = deployed
      send({ type: 'wallet', address: response.walletAddress, created: true, explorerUrl: `${explorer}/address/${response.walletAddress}` })
      send({ type: 'log', msg: `Deployed wallet: ${response.walletAddress}` })
      send({ type: 'log', msg: `Deploy tx: ${response.txHash}` })
    }
  } catch (err) {
    send({ type: 'step', step: 2, label: 'CHECK', status: 'error' })
    send({ type: 'error', msg: `Wallet load/deploy failed: ${String(err)}` })
    return
  }

  try {
    const balance = await wallet.getBalance()
    send({ type: 'log', msg: `USDC balance: $${parseFloat(balance).toFixed(4)}` })

    if (parseFloat(balance) < parseFloat(PAYMENT_AMOUNT)) {
      send({
        type: 'error',
        msg: `Insufficient USDC: wallet has $${parseFloat(balance).toFixed(4)}, needs $${PAYMENT_AMOUNT}. Fund ${wallet.walletAddress} at https://faucet.circle.com`,
      })
      return
    }
  } catch (err) {
    send({ type: 'step', step: 2, label: 'CHECK', status: 'error' })
    send({ type: 'error', msg: `Balance check failed: ${String(err)}` })
    return
  }

  if (bundlerUrl) {
    try {
      const ethBalance = await wallet.getEthBalance()
      const ethBalanceNum = parseFloat(ethBalance)
      send({ type: 'log', msg: `ETH balance (gas): ${ethBalanceNum.toFixed(6)} ETH` })

      if (ethBalanceNum < MIN_ETH_FOR_GAS) {
        send({
          type: 'error',
          msg: `Insufficient ETH for gas: wallet has ${ethBalanceNum.toFixed(6)} ETH, needs ≥${MIN_ETH_FOR_GAS} ETH. Send ETH to ${wallet.walletAddress} on Base Sepolia.`,
        })
        return
      }
    } catch (err) {
      send({ type: 'step', step: 2, label: 'CHECK', status: 'error' })
      send({ type: 'error', msg: `ETH balance check failed: ${String(err)}` })
      return
    }
  }

  send({ type: 'step', step: 2, label: 'CHECK', status: 'done' })

  send({ type: 'step', step: 3, label: 'PLAN', status: 'running' })

  const researchTargets = ['ETH', 'LINK', 'AAVE']
  const defiProtocols   = ['aave', 'uniswap']

  wallet.logger.logDecision(
    `Research plan: tokens=[${researchTargets.join(',')}] protocols=[${defiProtocols.join(',')}]`,
  )
  send({ type: 'log', msg: `Tokens:    ${researchTargets.join(', ')}` })
  send({ type: 'log', msg: `Protocols: ${defiProtocols.join(', ')}` })
  send({ type: 'step', step: 3, label: 'PLAN', status: 'done' })

  send({ type: 'step', step: 4, label: 'DISCOVER', status: 'running' })

  const signals: MarketSignal[] = []

  for (const symbol of researchTargets) {
    const result = await getTokenPrice(symbol)
    if (result.success && result.data) {
      signals.push(analyzeMarketSignal(result.data))
      wallet.logger.logToolCall({
        tool:      'get_token_price',
        input:     { symbol },
        output:    result.data,
        latencyMs: result.latencyMs,
        success:   true,
      })
      send({ type: 'price', symbol, price: result.data.usd, change: result.data.usd_24h_change, latency: result.latencyMs, success: true })
    } else {
      wallet.logger.logError(`Failed to fetch price for ${symbol}`, result.error)
      send({ type: 'price', symbol, price: 0, change: 0, latency: result.latencyMs, success: false })
    }
  }

  for (const protocol of defiProtocols) {
    const result = await getProtocolTVL(protocol)
    if (result.success && result.data) {
      wallet.logger.logToolCall({
        tool:      'get_protocol_tvl',
        input:     { protocol },
        output:    result.data,
        latencyMs: result.latencyMs,
        success:   true,
      })
      send({ type: 'tvl', protocol, tvl: result.data.tvl, change: result.data.change1d ?? 0, latency: result.latencyMs, success: true })
    } else {
      wallet.logger.logError(`Failed to fetch TVL for ${protocol}`, result.error)
      send({ type: 'tvl', protocol, tvl: 0, change: 0, latency: result.latencyMs, success: false })
    }
  }

  send({ type: 'step', step: 4, label: 'DISCOVER', status: 'done' })

  send({ type: 'step', step: 5, label: 'ANALYSE', status: 'running' })

  for (const sig of signals) {
    send({ type: 'signal', symbol: sig.symbol, price: sig.price, signal: sig.signal, confidence: sig.confidence, reason: sig.reason })
  }

  const strongest = signals.length > 0
    ? signals.reduce((a, b) => a.confidence > b.confidence ? a : b)
    : null

  if (strongest) {
    wallet.logger.logDecision(
      `Strongest signal: ${strongest.symbol} ${strongest.signal} (${(strongest.confidence * 100).toFixed(0)}% confidence)`,
    )
  }

  send({ type: 'step', step: 5, label: 'ANALYSE', status: 'done' })

  send({ type: 'step', step: 6, label: 'PAY', status: 'running' })

  const memo = `premium-insight:${strongest?.symbol.toLowerCase() ?? 'eth'}:research`

  let paymentResponse: Awaited<ReturnType<AgentWallet['pay']>>
  try {
    paymentResponse = await wallet.pay({
      to:       PAYMENT_RECIPIENT,
      amount:   PAYMENT_AMOUNT,
      currency: 'USDC',
      memo,
    })
  } catch (err) {
    send({ type: 'step', step: 6, label: 'PAY', status: 'error' })
    send({ type: 'error', msg: `Payment failed: ${String(err)}` })
    return
  }

  send({
    type:        'payment',
    amount:      PAYMENT_AMOUNT,
    recipient:   PAYMENT_RECIPIENT,
    txHash:      paymentResponse.hash,
    explorerUrl: `${explorer}/tx/${paymentResponse.hash}`,
  })

  send({ type: 'step', step: 6, label: 'PAY', status: 'done' })

  send({ type: 'step', step: 7, label: 'SETTLE', status: 'running' })

  send({ type: 'log', msg: `Tx hash:  ${paymentResponse.hash}` })
  send({ type: 'log', msg: `Log hash: ${paymentResponse.logHash}` })
  send({ type: 'log', msg: `Status:   ${paymentResponse.status}` })
  send({ type: 'log', msg: 'Committed to AgentRegistry' })

  send({ type: 'step', step: 7, label: 'SETTLE', status: 'done' })

  send({ type: 'step', step: 8, label: 'LOG', status: 'running' })

  const logEntries = wallet.logger.getEntries().length
  send({ type: 'log', msg: `${logEntries} entries written to agent_log.json` })
  send({ type: 'log', msg: `Session: ${wallet.logger.getSessionId()}` })

  send({ type: 'step', step: 8, label: 'LOG', status: 'done' })

  send({ type: 'step', step: 9, label: 'VERIFY', status: 'running' })

  try {
    const [isActive, record] = await Promise.all([
      wallet.isActive(),
      wallet.getOnChainRecord() as Promise<{
        executionCount: bigint | number
        reputationScore: bigint | number
        totalSettled: bigint
      }>,
    ])

    send({ type: 'log', msg: `✓ Registry status:  ${isActive ? 'active' : 'inactive'}` })
    send({ type: 'log', msg: `✓ Executions:       ${Number(record.executionCount)}` })
    send({ type: 'log', msg: `✓ Reputation:       ${(Number(record.reputationScore) / 100).toFixed(2)}%` })
    send({ type: 'log', msg: `✓ Total settled:    $${formatUnits(record.totalSettled, USDC_DECIMALS)} USDC` })
    send({ type: 'log', msg: `✓ Spend policy:     $${PAYMENT_AMOUNT} per-tx · $50.00 daily` })
    send({ type: 'log', msg: '✓ No human approval required' })
  } catch (err) {
    send({ type: 'log', msg: `Registry read: ${String(err)}` })
  }

  send({ type: 'step', step: 9, label: 'VERIFY', status: 'done' })

  send({
    type:          'complete',
    agentId,
    operator,
    walletAddress: wallet.walletAddress,
    paymentTx:     paymentResponse.hash,
    logEntries,
    signals:       signals.map(s => ({ symbol: s.symbol, price: s.price, signal: s.signal })),
  })
}
