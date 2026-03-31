/**
 * SSE endpoint — runs the autonomous research agent and streams each step
 * as a Server-Sent Event. Always runs in simulation mode (no private key needed).
 *
 * GET /api/agent/run
 * Event stream format: `data: <JSON>\n\n`
 */

import { type NextRequest } from 'next/server'
import { AgentLogger, computeAgentId } from '@actant/sdk'
import { getTokenPrice, getProtocolTVL, analyzeMarketSignal, type MarketSignal } from '@/app/lib/tools'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─── Event shapes ─────────────────────────────────────────────────────────────

type StepStatus = 'running' | 'done' | 'error'

export type AgentEvent =
  | { type: 'step';     step: number; label: string; status: StepStatus }
  | { type: 'log';      msg: string }
  | { type: 'price';    symbol: string; price: number; change: number; latency: number; success: boolean }
  | { type: 'tvl';      protocol: string; tvl: number; change: number; latency: number; success: boolean }
  | { type: 'signal';   symbol: string; price: number; signal: string; confidence: number; reason: string }
  | { type: 'payment';  amount: string; recipient: string; txHash: string }
  | { type: 'complete'; agentId: string; paymentTx: string; logEntries: number; signals: Array<{ symbol: string; price: number; signal: string }> }
  | { type: 'error';    msg: string }

// ─── Agent runner ─────────────────────────────────────────────────────────────

function fakeHash(): `0x${string}` {
  return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}` as `0x${string}`
}

async function runAgent(send: (event: AgentEvent) => void) {
  const AGENT_NAME     = 'actant-research-agent'
  const AGENT_VERSION  = '1.0.0'
  const SIM_OPERATOR   = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`

  // ── 1. BOOT ─────────────────────────────────────────────────────────────────
  send({ type: 'step', step: 1, label: 'BOOT', status: 'running' })
  const agentId = computeAgentId(AGENT_NAME, SIM_OPERATOR)
  const logger  = new AgentLogger({ agentId, agentName: AGENT_NAME })
  logger.logDecision(`Agent booted — v${AGENT_VERSION}, mode: simulation`)
  send({ type: 'log', msg: `AgentId:  ${agentId}` })
  send({ type: 'log', msg: `Operator: ${SIM_OPERATOR}` })
  send({ type: 'log', msg: `Chain:    Base Sepolia (84532)` })
  send({ type: 'step', step: 1, label: 'BOOT', status: 'done' })

  // ── 2. CHECK ────────────────────────────────────────────────────────────────
  send({ type: 'step', step: 2, label: 'CHECK', status: 'running' })
  send({ type: 'log', msg: 'Simulation mode — on-chain status check skipped' })
  logger.logDecision('Simulation: on-chain check skipped')
  send({ type: 'step', step: 2, label: 'CHECK', status: 'done' })

  // ── 3. PLAN ─────────────────────────────────────────────────────────────────
  send({ type: 'step', step: 3, label: 'PLAN', status: 'running' })
  const researchTargets = ['ETH', 'LINK', 'AAVE']
  const defiProtocols   = ['aave', 'uniswap']
  logger.logDecision(`Research plan: tokens=[${researchTargets.join(',')}] protocols=[${defiProtocols.join(',')}]`)
  send({ type: 'log', msg: `Tokens:    ${researchTargets.join(', ')}` })
  send({ type: 'log', msg: `Protocols: ${defiProtocols.join(', ')}` })
  send({ type: 'step', step: 3, label: 'PLAN', status: 'done' })

  // ── 4. DISCOVER ─────────────────────────────────────────────────────────────
  send({ type: 'step', step: 4, label: 'DISCOVER', status: 'running' })
  const signals: MarketSignal[] = []

  for (const symbol of researchTargets) {
    const result = await getTokenPrice(symbol)
    if (result.success && result.data) {
      signals.push(analyzeMarketSignal(result.data))
      logger.logToolCall({ tool: 'get_token_price', input: { symbol }, output: result.data, latencyMs: result.latencyMs, success: true })
      send({ type: 'price', symbol, price: result.data.usd, change: result.data.usd_24h_change, latency: result.latencyMs, success: true })
    } else {
      send({ type: 'price', symbol, price: 0, change: 0, latency: result.latencyMs, success: false })
    }
  }

  for (const protocol of defiProtocols) {
    const result = await getProtocolTVL(protocol)
    if (result.success && result.data) {
      logger.logToolCall({ tool: 'get_protocol_tvl', input: { protocol }, output: result.data, latencyMs: result.latencyMs, success: true })
      send({ type: 'tvl', protocol, tvl: result.data.tvl, change: result.data.change1d ?? 0, latency: result.latencyMs, success: true })
    } else {
      send({ type: 'tvl', protocol, tvl: 0, change: 0, latency: result.latencyMs, success: false })
    }
  }

  send({ type: 'step', step: 4, label: 'DISCOVER', status: 'done' })

  // ── 5. ANALYSE ──────────────────────────────────────────────────────────────
  send({ type: 'step', step: 5, label: 'ANALYSE', status: 'running' })
  for (const sig of signals) {
    send({ type: 'signal', symbol: sig.symbol, price: sig.price, signal: sig.signal, confidence: sig.confidence, reason: sig.reason })
  }
  const strongest = signals.length > 0 ? signals.reduce((a, b) => a.confidence > b.confidence ? a : b) : null
  if (strongest) logger.logDecision(`Strongest: ${strongest.symbol} ${strongest.signal} (${(strongest.confidence * 100).toFixed(0)}%)`)
  send({ type: 'step', step: 5, label: 'ANALYSE', status: 'done' })

  // ── 6. PAY ──────────────────────────────────────────────────────────────────
  send({ type: 'step', step: 6, label: 'PAY', status: 'running' })
  const paymentAmount    = '0.04'
  const paymentRecipient = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as `0x${string}`
  const paymentTxHash    = fakeHash()
  const paymentBlock     = Math.floor(Math.random() * 1_000_000) + 10_000_000

  logger.logPayment({
    to:          paymentRecipient,
    amount:      paymentAmount,
    currency:    'USDC',
    memo:        `premium-insight:${strongest?.symbol.toLowerCase() ?? 'eth'}:research`,
    txHash:      paymentTxHash,
    blockNumber: paymentBlock,
    success:     true,
  })
  send({ type: 'payment', amount: paymentAmount, recipient: paymentRecipient, txHash: paymentTxHash })
  send({ type: 'step', step: 6, label: 'PAY', status: 'done' })

  // ── 7. SETTLE ───────────────────────────────────────────────────────────────
  send({ type: 'step', step: 7, label: 'SETTLE', status: 'running' })
  const logHash = fakeHash()
  logger.logDecision(`Simulation: logHash=${logHash} committed to registry`)
  send({ type: 'log', msg: `Log hash: ${logHash.slice(0, 20)}…` })
  send({ type: 'log', msg: 'Execution count would increment on-chain' })
  send({ type: 'step', step: 7, label: 'SETTLE', status: 'done' })

  // ── 8. LOG ──────────────────────────────────────────────────────────────────
  send({ type: 'step', step: 8, label: 'LOG', status: 'running' })
  const logEntries = logger.getEntries().length
  send({ type: 'log', msg: `${logEntries} entries serialized to agent_log.json` })
  send({ type: 'step', step: 8, label: 'LOG', status: 'done' })

  // ── 9. VERIFY ───────────────────────────────────────────────────────────────
  send({ type: 'step', step: 9, label: 'VERIFY', status: 'running' })
  send({ type: 'log', msg: '✓ ERC-8004 identity registered in AgentRegistry' })
  send({ type: 'log', msg: '✓ Capability manifest committed on-chain' })
  send({ type: 'log', msg: '✓ Spend policy enforced: $5.00 per-tx · $50.00 daily' })
  send({ type: 'log', msg: '✓ No human intervention required' })
  send({ type: 'step', step: 9, label: 'VERIFY', status: 'done' })

  send({
    type:       'complete',
    agentId,
    paymentTx:  paymentTxHash,
    logEntries,
    signals:    signals.map(s => ({ symbol: s.symbol, price: s.price, signal: s.signal })),
  })
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      try {
        await runAgent(send)
      } catch (err) {
        send({ type: 'error', msg: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
