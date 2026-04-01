import type { RefObject } from 'react'
import type { ExecutionEvent } from '@/app/lib/contracts'

export const STEPS = [
  'BOOT',
  'CHECK',
  'PLAN',
  'DISCOVER',
  'ANALYSE',
  'PAY',
  'SETTLE',
  'LOG',
  'VERIFY',
] as const

export const TOTAL_STEPS = STEPS.length

export const IDLE_HIGHLIGHTS = [
  {
    label: 'Identity',
    desc: 'Deploys or reuses the wallet owned by your connected operator account',
  },
  {
    label: 'Live data',
    desc: 'CoinGecko + DeFiLlama · real prices, real TVL',
  },
  {
    label: 'Settlement',
    desc: '$0.04 USDC transferred on-chain from the connected Privy wallet flow',
  },
] as const

export type RunState = 'idle' | 'running' | 'complete' | 'error'
export type StepStatus = 'running' | 'done' | 'error'
export type StepStatusMap = Record<number, StepStatus>

export interface LogLine {
  id: number
  kind:
    | 'step'
    | 'log'
    | 'price'
    | 'tvl'
    | 'signal'
    | 'wallet'
    | 'payment'
    | 'complete'
  text: string
  ok?: boolean
  href?: string
}

export interface AgentRunnerProps {
  onNewExecution: (event: ExecutionEvent) => void
  onOperatorDetected: (operator: string) => void
}

export interface AgentRunnerViewModel {
  runState: RunState
  currentStep: number
  stepStatus: StepStatusMap
  lines: LogLine[]
  buttonDisabled: boolean
  buttonLabel: string
  footerText: string
  bottomRef: RefObject<HTMLDivElement | null>
  run: () => Promise<void>
  reset: () => void
}
