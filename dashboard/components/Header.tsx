'use client'

import WalletConnect from './WalletConnect'
import AppBrand from './ui/AppBrand'
import ChainPill from './ui/ChainPill'
import { CHAIN_LABEL, EXPLORER, REGISTRY_ADDRESS } from '@/app/lib/chain'

interface HeaderProps {
  operatorAddress: string
  onAddressChange: (address: string) => void
  isLive: boolean
  lastUpdated?: Date
}

export default function Header({
  operatorAddress,
  onAddressChange,
  isLive,
  lastUpdated,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#ff7c6f18] bg-[#0b0708]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[88rem] items-center gap-4 px-5 py-3 sm:px-6 md:px-8">
        <AppBrand subtitle="Operator Dashboard" />

        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={operatorAddress}
            onChange={(event) => onAddressChange(event.target.value)}
            placeholder="Operator address  0x…"
            spellCheck={false}
            className="w-full rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-sm text-white/70 outline-none transition-colors placeholder:text-white/20 focus:border-[#ff7c6f44] focus:text-white"
          />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <ChainPill label={CHAIN_LABEL} live={isLive} />

          {lastUpdated && (
            <p className="hidden font-mono text-[12px] text-white/20 lg:block">
              {lastUpdated.toLocaleTimeString()}
            </p>
          )}

          <WalletConnect />
        </div>
      </div>

      <div className="hidden border-t border-[#ff7c6f0c] lg:block">
        <div className="mx-auto flex max-w-[88rem] items-center gap-6 px-8 py-1.5">
          <p className="font-mono text-sm uppercase tracking-[0.1em] text-white/20">
            AgentRegistry · {CHAIN_LABEL}
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
              Set{' '}
              <code className="text-white/35">
                NEXT_PUBLIC_REGISTRY_ADDRESS
              </code>{' '}
              to connect
            </p>
          )}
        </div>
      </div>
    </header>
  )
}
