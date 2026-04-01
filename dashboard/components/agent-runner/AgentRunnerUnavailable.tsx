export default function AgentRunnerUnavailable() {
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
        <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-[#ffb16a]">
          Privy not configured
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/35">
          Add{' '}
          <code className="text-white/60">NEXT_PUBLIC_PRIVY_APP_ID</code> to run
          the demo with the connected operator wallet.
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
