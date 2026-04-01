'use client'

import { useEffect, useRef, useState } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { createWalletClient, custom, type Account } from 'viem'
import { runDemoAgent, type AgentEvent } from '@/app/lib/demoAgent'
import {
  CHAIN,
  CHAIN_ID,
  CHAIN_NAME,
  FACTORY_ADDRESS,
  REGISTRY_ADDRESS,
  RPC_URL,
} from '@/app/lib/chain'
import { TOTAL_STEPS, type AgentRunnerProps, type AgentRunnerViewModel, type LogLine, type RunState, type StepStatusMap } from './types'

export function useAgentRunner({
  onNewExecution,
  onOperatorDetected,
}: AgentRunnerProps): AgentRunnerViewModel {
  const { authenticated, ready, login } = usePrivy()
  const { wallets } = useWallets()

  const wallet = wallets[0]
  const address = wallet?.address as `0x${string}` | undefined

  const [runState, setRunState] = useState<RunState>('idle')
  const [currentStep, setCurrentStep] = useState(0)
  const [stepStatus, setStepStatus] = useState<StepStatusMap>({})
  const [lines, setLines] = useState<LogLine[]>([])

  const bottomRef = useRef<HTMLDivElement>(null)
  const runRef = useRef(0)
  const lineIdRef = useRef(0)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  useEffect(() => {
    return () => {
      runRef.current += 1
    }
  }, [])

  function addLine(line: Omit<LogLine, 'id'>) {
    setLines((prev) => [...prev, { ...line, id: ++lineIdRef.current }])
  }

  function clearRun(nextState: RunState) {
    setRunState(nextState)
    setCurrentStep(0)
    setStepStatus({})
    setLines([])
  }

  function applyEvent(event: AgentEvent) {
    switch (event.type) {
      case 'step':
        setCurrentStep(event.step)
        setStepStatus((prev) => ({ ...prev, [event.step]: event.status }))
        if (event.status === 'running') {
          addLine({
            kind: 'step',
            text: `[ ${event.step}/${TOTAL_STEPS} ] ${event.label}`,
            ok: true,
          })
        }
        break

      case 'log':
        addLine({ kind: 'log', text: `  ${event.msg}` })
        break

      case 'price':
        if (event.success) {
          const sign = event.change >= 0 ? '+' : ''
          addLine({
            kind: 'price',
            text: `  ${event.symbol.padEnd(5)}  $${event.price.toFixed(2).padStart(10)}   ${sign}${event.change.toFixed(2)}%   [${event.latency}ms]`,
            ok: true,
          })
        } else {
          addLine({
            kind: 'price',
            text: `  ${event.symbol}  ERROR fetching price`,
            ok: false,
          })
        }
        break

      case 'tvl':
        if (event.success) {
          const tvlB = (event.tvl / 1e9).toFixed(2)
          const sign = event.change >= 0 ? '+' : ''
          addLine({
            kind: 'tvl',
            text: `  ${event.protocol.padEnd(8)}  $${tvlB}B TVL   ${sign}${event.change.toFixed(2)}% 1d   [${event.latency}ms]`,
            ok: true,
          })
        } else {
          addLine({
            kind: 'tvl',
            text: `  ${event.protocol}  ERROR fetching TVL`,
            ok: false,
          })
        }
        break

      case 'signal': {
        const arrow =
          event.signal === 'bullish'
            ? '↑'
            : event.signal === 'bearish'
              ? '↓'
              : '→'
        const confidencePct = (event.confidence * 100).toFixed(0)
        addLine({
          kind: 'signal',
          text: `  ${arrow} ${event.symbol.padEnd(6)}  ${event.signal.padEnd(8)}  ${confidencePct}% conf  · ${event.reason}`,
          ok: event.signal !== 'bearish',
        })
        break
      }

      case 'wallet':
        addLine({
          kind: 'wallet',
          text: `  ${event.created ? 'Deployed' : 'Loaded'} wallet: ${event.address.slice(0, 20)}…`,
          ok: true,
          href: event.explorerUrl,
        })
        break

      case 'payment':
        addLine({
          kind: 'payment',
          text: `  Paying $${event.amount} USDC → ${event.recipient.slice(0, 10)}…`,
          ok: true,
        })
        addLine({
          kind: 'payment',
          text: `  tx: ${event.txHash.slice(0, 24)}…`,
          ok: true,
          href: event.explorerUrl,
        })
        break

      case 'complete':
        setRunState('complete')

        onNewExecution({
          agentId: event.agentId as `0x${string}`,
          logHash: event.paymentTx as `0x${string}`,
          amountSettled: '0.04',
          success: true,
          blockNumber: 0n,
          txHash: event.paymentTx as `0x${string}`,
          timestamp: new Date(),
        })

        if (event.operator) {
          onOperatorDetected(event.operator)
        }

        addLine({
          kind: 'complete',
          text: `\n  ✓ Execution complete · ${event.logEntries} log entries committed`,
          ok: true,
        })
        addLine({ kind: 'complete', text: `  AgentId: ${event.agentId}`, ok: true })
        addLine({
          kind: 'complete',
          text: `  Tx:      ${event.paymentTx}`,
          ok: true,
        })
        break

      case 'error':
        setRunState('error')
        addLine({ kind: 'log', text: `  ERROR: ${event.msg}`, ok: false })
        break
    }
  }

  async function getViemWalletClient() {
    if (!wallet || !address) {
      throw new Error(
        'No wallet connected. Use the Connect Wallet button in the header.',
      )
    }

    await wallet.switchChain(CHAIN_ID)
    const provider = await wallet.getEthereumProvider()
    return createWalletClient({
      account: address,
      chain: CHAIN,
      transport: custom(provider),
    })
  }

  async function run() {
    if (runState === 'running' || !ready) {
      return
    }

    if (!authenticated || !wallet || !address) {
      login()
      return
    }

    if (!REGISTRY_ADDRESS || !FACTORY_ADDRESS) {
      lineIdRef.current = 0
      clearRun('error')
      addLine({
        kind: 'log',
        text: '  ERROR: Registry/Factory not configured. Set NEXT_PUBLIC_REGISTRY_ADDRESS and NEXT_PUBLIC_FACTORY_ADDRESS.',
        ok: false,
      })
      return
    }

    const runId = ++runRef.current
    const send = (event: AgentEvent) => {
      if (runId === runRef.current) {
        applyEvent(event)
      }
    }

    lineIdRef.current = 0
    setRunState('running')
    setCurrentStep(0)
    setStepStatus({})
    setLines([])

    try {
      const walletClient = await getViemWalletClient()
      await runDemoAgent(send, {
        account: walletClient.account as Account,
        externalWalletClient: walletClient,
        chainId: CHAIN_ID,
        rpcUrl: RPC_URL,
        factory: FACTORY_ADDRESS as `0x${string}`,
        registry: REGISTRY_ADDRESS as `0x${string}`,
        bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL || undefined,
      })
    } catch (err) {
      if (runId !== runRef.current) {
        return
      }
      setRunState('error')
      addLine({ kind: 'log', text: `  ERROR: ${String(err)}`, ok: false })
    }
  }

  function reset() {
    runRef.current += 1
    lineIdRef.current = 0
    clearRun('idle')
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

  return {
    runState,
    currentStep,
    stepStatus,
    lines,
    buttonDisabled,
    buttonLabel,
    footerText,
    bottomRef,
    run,
    reset,
  }
}
