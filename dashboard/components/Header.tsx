'use client'

import { CHAIN_ID, REGISTRY_ADDRESS, EXPLORER } from '@/app/lib/chain'

interface HeaderProps {
  operatorAddress: string
  onAddressChange: (addr: string) => void
  isLive: boolean
  lastUpdated?: Date
}

export default function Header({ operatorAddress, onAddressChange, isLive, lastUpdated }: HeaderProps) {
  const chainLabel = CHAIN_ID === 8453 ? 'Base' : 'Base Sepolia'

  return (
    <header className="sticky top-0 z-40 border-b border-[#ff7c6f18] bg-[#0b0708]/92 backdrop-blur-xl">
      {/* ── Main row ── */}
      <div className="mx-auto flex max-w-[88rem] items-center gap-4 px-5 py-3 sm:px-6 md:px-8">

        {/* Brand */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ff7c6f55] bg-[#ff7c6f14]">
            <span className="text-sm font-semibold text-[#ff9f95]">A</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-none tracking-[-0.04em] text-white">Actant</p>
            <p className="mt-0.5 font-mono text-[12px] uppercase tracking-[0.18em] text-white/30">Operator Dashboard</p>
          </div>
        </div>

        {/* Operator address input */}
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={operatorAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="Enter operator address  0x…"
            spellCheck={false}
            className="w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-sm text-white/70 outline-none transition-colors placeholder:text-white/20 focus:border-[#ff7c6f44] focus:text-white"
          />
        </div>

        {/* Right indicators */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-[#7ad8b8] live-dot' : 'bg-white/20'}`} />
            <span className="hidden font-mono text-[12px] uppercase tracking-[0.14em] text-white/40 sm:block">
              {chainLabel}
            </span>
          </div>
          {lastUpdated && (
            <p className="hidden font-mono text-[12px] text-white/20 lg:block">
              {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* ── Registry strip (desktop only) ── */}
      <div className="hidden border-t border-[#ff7c6f0c] lg:block">
        <div className="mx-auto flex max-w-[88rem] items-center gap-6 px-8 py-1.5">
          <p className="font-mono text-sm uppercase tracking-[0.1em] text-white/20">
            AgentRegistry · {chainLabel}
          </p>
          {REGISTRY_ADDRESS ? (
            <a
              href={`${EXPLORER}/address/${REGISTRY_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-mono text-[12px] text-[#7ad8b8]/50 transition-colors hover:text-[#7ad8b8]"
            >
              <span className="h-1 w-1 rounded-full bg-[#7ad8b8]/50" />
              {REGISTRY_ADDRESS.slice(0, 10)}…{REGISTRY_ADDRESS.slice(-8)}
            </a>
          ) : (
            <p className="font-mono text-[12px] text-white/20">
              Set <code className="text-white/35">NEXT_PUBLIC_REGISTRY_ADDRESS</code> to connect
            </p>
          )}
        </div>
      </div>
    </header>
  )
}
