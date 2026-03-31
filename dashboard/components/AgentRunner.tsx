'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AgentEvent } from '@/app/api/agent/run/route'
import type { ExecutionEvent } from '@/app/lib/contracts'

const STEPS = ['BOOT', 'CHECK', 'PLAN', 'DISCOVER', 'ANALYSE', 'PAY', 'SETTLE', 'LOG', 'VERIFY'] as const

type RunState = 'idle' | 'running' | 'complete' | 'error'

interface LogLine {
  id:      number
  kind:    'step' | 'log' | 'price' | 'tvl' | 'signal' | 'payment' | 'complete'
  text:    string
  ok?:     boolean
}

interface AgentRunnerProps {
  onNewExecution: (event: ExecutionEvent) => void
}

let _lineId = 0

export default function AgentRunner({ onNewExecution }: AgentRunnerProps) {
  const [runState,    setRunState]    = useState<RunState>('idle')
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStatus,  setStepStatus]  = useState<Record<number, 'running' | 'done' | 'error'>>({})
  const [lines,       setLines]       = useState<LogLine[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const esRef     = useRef<EventSource | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  function addLine(line: Omit<LogLine, 'id'>) {
    setLines(prev => [...prev, { ...line, id: ++_lineId }])
  }

  function run() {
    if (runState === 'running') return

    setRunState('running')
    setCurrentStep(0)
    setStepStatus({})
    setLines([])

    const es = new EventSource('/api/agent/run')
    esRef.current = es

    es.onmessage = (e) => {
      const event = JSON.parse(e.data) as AgentEvent

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
          addLine({ kind: 'signal', text: `  ${arrow} ${(event.symbol as string).padEnd(6)}  ${(event.signal as string).padEnd(8)}  ${pct}% conf  — ${event.reason}`, ok: event.signal !== 'bearish' })
          break
        }

        case 'payment':
          addLine({ kind: 'payment', text: `  Paying $${event.amount} USDC → ${(event.recipient as string).slice(0, 10)}…`, ok: true })
          addLine({ kind: 'payment', text: `  [SIM] tx: ${(event.txHash as string).slice(0, 20)}…`, ok: true })
          break

        case 'complete': {
          setRunState('complete')
          es.close()

          // Inject into the execution feed
          onNewExecution({
            agentId:       event.agentId as `0x${string}`,
            logHash:       event.paymentTx as `0x${string}`,
            amountSettled: '0.04',
            success:       true,
            blockNumber:   BigInt(Math.floor(Math.random() * 1_000_000) + 15_000_000),
            txHash:        event.paymentTx as `0x${string}`,
            timestamp:     new Date(),
          })

          addLine({ kind: 'complete', text: `\n  ✓ Agent execution complete. ${event.logEntries} entries logged.`, ok: true })
          addLine({ kind: 'complete', text: `  AgentId: ${(event.agentId as string).slice(0, 20)}…`, ok: true })
          addLine({ kind: 'complete', text: `  Tx:      ${(event.paymentTx as string).slice(0, 20)}…`, ok: true })
          break
        }

        case 'error':
          setRunState('error')
          addLine({ kind: 'log', text: `  ERROR: ${event.msg}`, ok: false })
          es.close()
          break
      }
    }

    es.onerror = () => {
      setRunState('error')
      addLine({ kind: 'log', text: '  Connection error', ok: false })
      es.close()
    }
  }

  function reset() {
    esRef.current?.close()
    setRunState('idle')
    setCurrentStep(0)
    setStepStatus({})
    setLines([])
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#ff7c6f12] px-5 py-4">
        <div>
          <p className="eyebrow text-white/30">Live Agent Runner</p>
          <p className="mt-1 text-sm font-medium tracking-[-0.02em] text-white/80">
            Autonomous research agent — ERC-8004 · ERC-4337
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
            disabled={runState === 'running'}
            className={`rounded-full px-5 py-2 font-mono text-[13px] uppercase tracking-[0.12em] transition-all disabled:cursor-not-allowed ${
              runState === 'running'
                ? 'border border-[#ff9f9544] bg-[#ff9f9508] text-[#ff9f95]/50'
                : 'border border-[#ff9f9566] bg-[#ff9f9514] text-[#ff9f95] hover:bg-[#ff9f9522]'
            }`}
          >
            {runState === 'running' ? 'Running…' : runState === 'complete' ? 'Run Again' : 'Run Agent'}
          </button>
        </div>
      </div>

      {/* Step dots */}
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

      {/* Terminal */}
      <div className={`transition-all duration-500 ${runState === 'idle' ? 'max-h-0' : 'max-h-[480px]'} overflow-hidden`}>
        <div className="max-h-[480px] overflow-y-auto bg-[#06050400] px-5 py-4 font-mono text-sm leading-6">
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={
                  line.kind === 'step'    ? 'mt-3 text-[#ff9f95] first:mt-0' :
                  line.kind === 'signal'  ? (line.ok ? 'text-[#7ad8b8]/80' : 'text-[#ffb16a]/80') :
                  line.kind === 'payment' ? 'text-[#9db3ff]/80' :
                  line.kind === 'complete'? 'text-[#7ad8b8]' :
                  line.ok === false       ? 'text-[#ff7f7f]/70' :
                  'text-white/35'
                }
              >
                {line.text}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Idle placeholder */}
      {runState === 'idle' && (
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <div className="mb-4 grid grid-cols-3 gap-4 text-left">
            {[
              { label: 'Identity',  desc: 'ERC-8004 manifest loaded from registry' },
              { label: 'Live data', desc: 'CoinGecko + DeFiLlama — no API key' },
              { label: 'Payment',   desc: '$0.04 USDC settled via ERC-4337' },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-xl border border-[#ff7c6f12] bg-[#ff7c6f06] p-3">
                <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#ff9f95]/60">{label}</p>
                <p className="mt-1.5 text-sm text-white/40 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
          <p className="font-mono text-[13px] text-white/20">
            Runs 9-step lifecycle · Simulation mode · No wallet required
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#ff7c6f12] px-5 py-3">
        <p className="font-mono text-[12px] text-white/20">
          Simulation mode — real API data, simulated transactions · Set env vars for live Base Sepolia execution
        </p>
      </div>
    </div>
  )
}
