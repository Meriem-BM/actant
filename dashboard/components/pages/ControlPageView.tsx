import Link from 'next/link'
import ControlPanel from '@/components/ControlPanel'
import AppBrand from '@/components/ui/AppBrand'
import ChainPill from '@/components/ui/ChainPill'
import { CHAIN_LABEL } from '@/app/lib/chain'

export default function ControlPageView() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[#ff7c6f18] bg-[#0b0708]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[88rem] items-center gap-4 px-5 py-3 sm:px-6 md:px-8">
          <AppBrand href="/" subtitle="Control Panel" />

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-white/40 transition-colors hover:text-white"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M6 1L2 5l4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Dashboard
            </Link>

            <ChainPill label={CHAIN_LABEL} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-10 sm:px-6 md:px-8">
        <div className="mb-8">
          <p className="eyebrow text-white/30">Agent Management</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">
            Control Panel
          </h1>
          <p className="mt-2 font-mono text-sm leading-relaxed text-white/40">
            Connect your wallet to deploy agent accounts, fund gas, and manage
            spend policies.
          </p>
        </div>

        <ControlPanel />

        <p className="mt-8 text-center font-mono text-[12px] text-white/15">
          ERC-4337 execution accounts · ERC-8004 agent identity · Base L2
        </p>
      </main>
    </div>
  )
}
