import { AnimatePresence, motion } from 'framer-motion'
import {
  IDLE_HIGHLIGHTS,
  STEPS,
  TOTAL_STEPS,
  type AgentRunnerViewModel,
  type LogLine,
  type StepStatusMap,
} from './types'

function RunnerHeader({
  runState,
  buttonDisabled,
  buttonLabel,
  onRun,
  onReset,
}: {
  runState: AgentRunnerViewModel['runState']
  buttonDisabled: boolean
  buttonLabel: string
  onRun: () => Promise<void>
  onReset: () => void
}) {
  return (
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
            onClick={onReset}
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 font-mono text-[13px] uppercase tracking-[0.12em] text-white/40 transition-colors hover:text-white"
          >
            Reset
          </button>
        )}
        <button
          onClick={onRun}
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
  )
}

function stepDotClass(
  status: StepStatusMap[number] | undefined,
  currentStep: number,
  stepNum: number,
) {
  if (status === 'done') return 'bg-[#7ad8b8] shadow-[0_0_6px_#7ad8b888]'
  if (status === 'running') {
    return 'bg-[#ff9f95] shadow-[0_0_6px_#ff9f9588] animate-pulse'
  }
  if (status === 'error') return 'bg-[#ff7f7f]'
  if (stepNum < currentStep) return 'bg-[#7ad8b8]/30'
  return 'bg-white/10'
}

function StepProgress({
  currentStep,
  stepStatus,
}: {
  currentStep: number
  stepStatus: StepStatusMap
}) {
  return (
    <div className="flex items-center gap-2 border-b border-[#ff7c6f0c] px-5 py-3">
      <p className="mr-3 font-mono text-[12px] uppercase tracking-[0.18em] text-white/20">
        Steps
      </p>
      {STEPS.map((label, i) => {
        const stepNum = i + 1
        const status = stepStatus[stepNum]

        return (
          <div key={stepNum} className="group relative flex flex-col items-center">
            <div
              className={`h-2 w-2 rounded-full transition-all duration-300 ${stepDotClass(status, currentStep, stepNum)}`}
            />
            <span className="pointer-events-none absolute top-4 hidden whitespace-nowrap rounded border border-white/10 bg-[#1a0f11] px-2 py-0.5 font-mono text-sm text-white/50 group-hover:block">
              {label}
            </span>
          </div>
        )
      })}
      <div className="ml-2 font-mono text-[12px] text-white/20">
        {currentStep > 0 ? `${currentStep}/${TOTAL_STEPS}` : ''}
      </div>
    </div>
  )
}

function lineClassName(line: LogLine) {
  if (line.kind === 'step') return 'mt-3 text-[#ff9f95] first:mt-0'
  if (line.kind === 'signal') {
    return line.ok ? 'text-[#7ad8b8]/80' : 'text-[#ffb16a]/80'
  }
  if (line.kind === 'wallet' || line.kind === 'payment') return 'text-[#9db3ff]/80'
  if (line.kind === 'complete') return 'text-[#7ad8b8]'
  if (line.ok === false) return 'text-[#ff7f7f]/70'
  return 'text-white/35'
}

function LogStream({
  runState,
  lines,
  bottomRef,
}: {
  runState: AgentRunnerViewModel['runState']
  lines: LogLine[]
  bottomRef: AgentRunnerViewModel['bottomRef']
}) {
  return (
    <div
      className={`overflow-hidden transition-all duration-500 ${runState === 'idle' ? 'max-h-0' : 'max-h-[480px]'}`}
    >
      <div className="max-h-[480px] overflow-y-auto bg-[#06050400] px-5 py-4 font-mono text-sm leading-6">
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className={lineClassName(line)}
            >
              {line.href ? (
                <a
                  href={line.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 opacity-80 hover:opacity-100"
                >
                  {line.text}
                </a>
              ) : (
                line.text
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 grid grid-cols-3 gap-4 text-left">
        {IDLE_HIGHLIGHTS.map(({ label, desc }) => (
          <div key={label} className="rounded-xl border border-[#ff7c6f12] bg-[#ff7c6f06] p-3">
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#ff9f95]/60">
              {label}
            </p>
            <p className="mt-1.5 text-sm leading-snug text-white/40">{desc}</p>
          </div>
        ))}
      </div>
      <p className="font-mono text-[13px] text-white/20">
        {TOTAL_STEPS}-step autonomous lifecycle · Current operator wallet signs
        the demo run
      </p>
    </div>
  )
}

function RunnerFooter({ footerText }: { footerText: string }) {
  return (
    <div className="border-t border-[#ff7c6f12] px-5 py-3">
      <p className="font-mono text-[12px] text-white/20">{footerText}</p>
    </div>
  )
}

export default function AgentRunnerView({
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
}: AgentRunnerViewModel) {
  return (
    <div className="card overflow-hidden">
      <RunnerHeader
        runState={runState}
        buttonDisabled={buttonDisabled}
        buttonLabel={buttonLabel}
        onRun={run}
        onReset={reset}
      />
      <StepProgress currentStep={currentStep} stepStatus={stepStatus} />
      <LogStream runState={runState} lines={lines} bottomRef={bottomRef} />
      {runState === 'idle' && <IdleState />}
      <RunnerFooter footerText={footerText} />
    </div>
  )
}
