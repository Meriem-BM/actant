'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { createWalletClient, custom, type Account } from 'viem'
import { runDemoAgent, type AgentEvent } from '@/app/lib/demoAgent'
import type { ExecutionEvent } from '@/app/lib/contracts'
import {
  CHAIN,
  CHAIN_ID,
  CHAIN_NAME,
  FACTORY_ADDRESS,
  REGISTRY_ADDRESS,
  RPC_URL,
} from '@/app/lib/chain'

const STEPS = ['BOOT', 'CHECK', 'PLAN', 'DISCOVER', 'ANALYSE', 'PAY', 'SETTLE', 'LOG', 'VERIFY'] as const

type RunState = 'idle' | 'running' | 'complete' | 'error'

interface LogLine {
  id:      number
  kind:    'step' | 'log' | 'price' | 'tvl' | 'signal' | 'wallet' | 'payment' | 'complete'
  text:    string
  ok?:     boolean
  href?:   string
}

interface AgentRunnerProps {
  onNewExecution:     (event: ExecutionEvent) => void
  onOperatorDetected: (operator: string) => void
}

let _lineId = 0

function AgentRunnerUnavailable() {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#ff7c6f12] px-5 py-4">
        <div>
          <p className="eyebrow text-white/30">Live Agent Runner</p>
          <p className="mt-1 text-sm font-medium tracking-[-0.02em] text-white/80">
            Autonomous research agent · ERC-8004 · ERC-4337
          </p>
        </div>
        <button
          disabled
          className="rounded-full border border-[#ff9f9544] bg-[#ff9f9508] px-5 py-2 font-mono text-[13px] uppercase tracking-[0.12em] text-[#ff9f95]/50"
        >
          Privy Required
        </button>
      </div>

      <div className="px-6 py-10 text-center">
        <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-[#ffb16a]">Privy not configured</p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/35">
          Add <code className="text-white/60">NEXT_PUBLIC_PRIVY_APP_ID</code> to run the demo with the connected operator wallet instead of a server-side private key.
        </p>
      </div>

      <div className="border-t border-[#ff7c6f12] px-5 py-3">
        <p className="font-mono text-[12px] text-white/20">
          Demo signing is now driven by the connected Privy wallet
        </p>
      </div>
    </div>
  )
}

function AgentRunnerInner({ onNewExecution, onOperatorDetected }: AgentRunnerProps) {
  const { authenticated, ready, login } = usePrivy()
  const { wallets } = useWallets()

  const wallet  = wallets[0]
  const address = wallet?.address as `0x${string}` | undefined

  const [runState,    setRunState]    = useState<RunState>('idle')
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStatus,  setStepStatus]  = useState<Record<number, 'running' | 'done' | 'error'>>({})
  const [lines,       setLines]       = useState<LogLine[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const runRef    = useRef(0)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  useEffect(() => {
    return () => { runRef.current += 1 }
  }, [])

  function addLine(line: Omit<LogLine, 'id'>) {
    setLines(prev => [...prev, { ...line, id: ++_lineId }])
  }

  function applyEvent(event: AgentEvent) {
    switch (event.type) {
      case 'step':
        setCurrentStep(event.step)
        setStepStatus(prev => ({ ...prev, [event.step]: event.status }))
        if (event.status === 'running') {
          addLine({ kind: 'step', text: `[ ${event.step}/9 ] ${event.label}`, ok: true })
        }
        break

      case 'log':
        addLine({ kind: 'log', text: `  ${event.msg}` })
        break

      case 'price':
        if (event.success) {
          const sign = event.change >= 0 ? '+' : ''
          addLine({ kind: 'price', text: `  ${event.symbol.padEnd(5)}  $${(event.price as number).toFixed(2).padStart(10)}   ${sign}${(event.change as number).toFixed(2)}%   [${event.latency}ms]`, ok: true })
        } else {
          addLine({ kind: 'price', text: `  ${event.symbol}  ERROR fetching price`, ok: false })
        }
        break

      case 'tvl':
        if (event.success) {
          const tvlB = ((event.tvl as number) / 1e9).toFixed(2)
          const sign = (event.change as number) >= 0 ? '+' : ''
          addLine({ kind: 'tvl', text: `  ${(event.protocol as string).padEnd(8)}  $${tvlB}B TVL   ${sign}${(event.change as number).toFixed(2)}% 1d   [${event.latency}ms]`, ok: true })
        } else {
          addLine({ kind: 'tvl', text: `  ${event.protocol}  ERROR fetching TVL`, ok: false })
        }
        break

      case 'signal': {
        const arrow = event.signal === 'bullish' ? '↑' : event.signal === 'bearish' ? '↓' : '→'
        const pct   = ((event.confidence as number) * 100).toFixed(0)
        addLine({ kind: 'signal', text: `  ${arrow} ${(event.symbol as string).padEnd(6)}  ${(event.signal as string).padEnd(8)}  ${pct}% conf  · ${event.reason}`, ok: event.signal !== 'bearish' })
        break
      }

      case 'wallet':
        addLine({
          kind: 'wallet',
          text: `  ${event.created ? 'Deployed' : 'Loaded'} wallet: ${(event.address as string).slice(0, 20)}…`,
          ok:   true,
          href: event.explorerUrl as string,
        })
        break

      case 'payment':
        addLine({ kind: 'payment', text: `  Paying $${event.amount} USDC → ${(event.recipient as string).slice(0, 10)}…`, ok: true })
        addLine({
          kind: 'payment',
          text: `  tx: ${(event.txHash as string).slice(0, 24)}…`,
          ok:   true,
          href: event.explorerUrl as string,
        })
        break

      case 'complete':
        setRunState('complete')

        onNewExecution({
          agentId:       event.agentId as `0x${string}`,
          logHash:       event.paymentTx as `0x${string}`,
          amountSettled: '0.04',
          success:       true,
          blockNumber:   0n,
          txHash:        event.paymentTx as `0x${string}`,
          timestamp:     new Date(),
        })

        if (event.operator) onOperatorDetected(event.operator as string)

        addLine({ kind: 'complete', text: '\n  ✓ Execution complete · ' + `${event.logEntries} log entries committed`, ok: true })
        addLine({ kind: 'complete', text: `  AgentId: ${(event.agentId as string).slice(0, 22)}…`, ok: true })
        addLine({ kind: 'complete', text: `  Tx:      ${(event.paymentTx as string).slice(0, 22)}…`, ok: true })
        break

      case 'error':
        setRunState('error')
        addLine({ kind: 'log', text: `  ERROR: ${event.msg}`, ok: false })
        break
    }
  }

  async function getViemWalletClient() {
    if (!wallet || !address) throw new Error('No wallet connected. Use the Connect Wallet button in the header.')
    await wallet.switchChain(CHAIN_ID)
    const provider = await wallet.getEthereumProvider()
    return createWalletClient({
      account:   address,
      chain:     CHAIN,
      transport: custom(provider),
    })
  }

  async function run() {
    if (runState === 'running') return
    if (!ready) return

    if (!authenticated || !wallet || !address) {
      login()
      return
    }

    if (!REGISTRY_ADDRESS || !FACTORY_ADDRESS) {
      setRunState('error')
      setCurrentStep(0)
      setStepStatus({})
      setLines([])
      addLine({ kind: 'log', text: '  ERROR: Registry/Factory not configured. Set NEXT_PUBLIC_REGISTRY_ADDRESS and NEXT_PUBLIC_FACTORY_ADDRESS.', ok: false })
      return
    }

    const runId = ++runRef.current
    const send = (event: AgentEvent) => {
      if (runId !== runRef.current) return
      applyEvent(event)
    }

    setRunState('running')
    setCurrentStep(0)
    setStepStatus({})
    setLines([])

    try {
      const walletClient = await getViemWalletClient()
      await runDemoAgent(send, {
        account:              walletClient.account as Account,
        externalWalletClient: walletClient,
        chainId:              CHAIN_ID,
        rpcUrl:               RPC_URL,
        factory:              FACTORY_ADDRESS as `0x${string}`,
        registry:             REGISTRY_ADDRESS as `0x${string}`,
        bundlerUrl:           process.env.NEXT_PUBLIC_BUNDLER_URL || undefined,
      })
    } catch (err) {
      if (runId !== runRef.current) return
      setRunState('error')
      addLine({ kind: 'log', text: `  ERROR: ${String(err)}`, ok: false })
    }
  }

  function reset() {
    runRef.current += 1
    setRunState('idle')
    setCurrentStep(0)
    setStepStatus({})
    setLines([])
  }

  const requiresWallet = !authenticated || !address
  const buttonDisabled = runState === 'running' || !ready
  const buttonLabel =
    runState === 'running'
      ? 'Running…'
      : requiresWallet
        ? 'Connect Wallet'
        : runState === 'complete'
          ? 'Run Again'
          : 'Run Agent'

  const footerText = !ready
    ? 'Initializing Privy wallet bridge…'
    : requiresWallet
      ? 'Connect a Privy wallet to run the demo from the current operator account'
      : process.env.NEXT_PUBLIC_BUNDLER_URL
        ? `Signs with connected Privy wallet on ${CHAIN_NAME} via ERC-4337`
        : `Signs with connected Privy wallet on ${CHAIN_NAME} in direct EOA mode`

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#ff7c6f12] px-5 py-4">
        <div>
          <p className="eyebrow text-white/30">Live Agent Runner</p>
          <p className="mt-1 text-sm font-medium tracking-[-0.02em] text-white/80">
            Autonomous research agent · ERC-8004 · ERC-4337
          </p>
        </div>
        <div className="flex items-center gap-3">
          {runState === 'complete' && (
            <button
              onClick={reset}
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 font-mono text-[13px] uppercase tracking-[0.12em] text-white/40 transition-colors hover:text-white"
            >
              Reset
            </button>
          )}
          <button
            onClick={run}
            disabled={buttonDisabled}
            className={`rounded-full px-5 py-2 font-mono text-[13px] uppercase tracking-[0.12em] transition-all disabled:cursor-not-allowed ${
              buttonDisabled
                ? 'border border-[#ff9f9544] bg-[#ff9f9508] text-[#ff9f95]/50'
                : 'border border-[#ff9f9566] bg-[#ff9f9514] text-[#ff9f95] hover:bg-[#ff9f9522]'
            }`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-[#ff7c6f0c] px-5 py-3">
        <p className="mr-3 font-mono text-[12px] uppercase tracking-[0.18em] text-white/20">Steps</p>
        {STEPS.map((label, i) => {
          const num    = i + 1
          const status = stepStatus[num]
          return (
            <div key={num} className="group relative flex flex-col items-center">
              <div className={`h-2 w-2 rounded-full transition-all duration-300 ${
                status === 'done'    ? 'bg-[#7ad8b8] shadow-[0_0_6px_#7ad8b888]' :
                status === 'running' ? 'bg-[#ff9f95] shadow-[0_0_6px_#ff9f9588] animate-pulse' :
                status === 'error'   ? 'bg-[#ff7f7f]' :
                num < currentStep    ? 'bg-[#7ad8b8]/30' :
                'bg-white/10'
              }`} />
              <span className="pointer-events-none absolute top-4 hidden whitespace-nowrap rounded border border-white/10 bg-[#1a0f11] px-2 py-0.5 font-mono text-sm text-white/50 group-hover:block">
                {label}
              </span>
            </div>
          )
        })}
        <div className="ml-2 font-mono text-[12px] text-white/20">
          {currentStep > 0 ? `${currentStep}/9` : ''}
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-500 ${runState === 'idle' ? 'max-h-0' : 'max-h-[480px]'}`}>
        <div className="max-h-[480px] overflow-y-auto bg-[#06050400] px-5 py-4 font-mono text-sm leading-6">
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={
                  line.kind === 'step'     ? 'mt-3 text-[#ff9f95] first:mt-0' :
                  line.kind === 'signal'   ? (line.ok ? 'text-[#7ad8b8]/80' : 'text-[#ffb16a]/80') :
                  line.kind === 'wallet'   ? 'text-[#9db3ff]/80' :
                  line.kind === 'payment'  ? 'text-[#9db3ff]/80' :
                  line.kind === 'complete' ? 'text-[#7ad8b8]' :
                  line.ok === false        ? 'text-[#ff7f7f]/70' :
                  'text-white/35'
                }
              >
                {line.href
                  ? <a href={line.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 opacity-80 hover:opacity-100">{line.text}</a>
                  : line.text
                }
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      {runState === 'idle' && (
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <div className="mb-4 grid grid-cols-3 gap-4 text-left">
            {[
              { label: 'Identity', desc: 'Deploys or reuses the wallet owned by your connected operator account' },
              { label: 'Live data', desc: 'CoinGecko + DeFiLlama · real prices, real TVL' },
              { label: 'Settlement', desc: '$0.04 USDC transferred on-chain from the connected Privy wallet flow' },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-xl border border-[#ff7c6f12] bg-[#ff7c6f06] p-3">
                <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#ff9f95]/60">{label}</p>
                <p className="mt-1.5 text-sm leading-snug text-white/40">{desc}</p>
              </div>
            ))}
          </div>
          <p className="font-mono text-[13px] text-white/20">
            9-step autonomous lifecycle · Current operator wallet signs the demo run
          </p>
        </div>
      )}

      <div className="border-t border-[#ff7c6f12] px-5 py-3">
        <p className="font-mono text-[12px] text-white/20">
          {footerText}
        </p>
      </div>
    </div>
  )
}

export default function AgentRunner(props: AgentRunnerProps) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return <AgentRunnerUnavailable />
  }

  return <AgentRunnerInner {...props} />
}
