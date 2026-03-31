'use client'

import { CHAIN_NAME, REGISTRY_ADDRESS } from '@/app/lib/chain'

interface EmptyStateProps {
  hasAddress: boolean
  panelTitle?: string
  panelSubtitle?: string
}

export default function EmptyState({ hasAddress, panelTitle, panelSubtitle }: EmptyStateProps) {
  const isMissingContracts = !REGISTRY_ADDRESS
  const showPanelHeader = Boolean(panelTitle)

  return (
    <div className="card relative overflow-hidden">
      {showPanelHeader && (
        <div className="flex items-center justify-between border-b border-[#ff7c6f12] px-5 py-4">
          <div>
            <p className="eyebrow text-white/30">{panelTitle}</p>
            <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-white/80">
              {panelSubtitle}
            </p>
          </div>
          <span className="rounded-full border border-[#ff7c6f22] bg-[#ff7c6f10] px-3 py-1 font-mono text-[12px] uppercase tracking-[0.12em] text-[#ff9f95]">
            Demo Mode
          </span>
        </div>
      )}

      <div className={`relative overflow-hidden ${showPanelHeader ? 'px-6 py-8 sm:px-8 sm:py-9' : 'px-8 py-20'} text-center`}>
        {isMissingContracts ? (
          <>
            <div className="pointer-events-none absolute inset-x-10 top-0 h-32 rounded-full bg-[radial-gradient(circle,rgba(255,124,111,0.16),transparent_72%)] blur-2xl" />

            <div className="relative flex flex-col items-center">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#ff7c6f33] bg-[#ff7c6f0d]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="7" width="18" height="13" rx="2" stroke="#ff9f95" strokeWidth="1.5" strokeOpacity="0.6" />
                  <path d="M3 11h18M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="#ff9f95" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
                </svg>
              </div>

              <p className="text-xl font-semibold tracking-[-0.03em] text-white/85">
                Contracts not configured
              </p>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/45">
                Set <code className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-sm text-[#ff9f95]">NEXT_PUBLIC_REGISTRY_ADDRESS</code> to connect the dashboard to a deployed registry.
              </p>

              <div className="mt-8 grid w-full max-w-3xl gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left">
                  <p className="eyebrow text-white/25">Required Env</p>
                  <p className="mt-3 font-mono text-[13px] text-[#ff9f95]">NEXT_PUBLIC_REGISTRY_ADDRESS</p>
                  <p className="mt-2 text-sm leading-6 text-white/42">
                    Point the UI at your deployed <span className="font-mono text-white/60">AgentRegistry</span>.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left">
                  <p className="eyebrow text-white/25">Quick Start</p>
                  <p className="mt-3 font-mono text-[13px] text-[#ff9f95]">bun run deploy</p>
                  <p className="mt-2 text-sm leading-6 text-white/42">
                    Deploy from <span className="font-mono text-white/60">apps/demo</span>, then add the resulting address to <span className="font-mono text-white/60">.env.local</span>.
                  </p>
                </div>
              </div>

              <div className="mt-6 w-full max-w-3xl rounded-2xl border border-[#ff7c6f18] bg-[#ff7c6f08] p-4 text-left">
                <p className="eyebrow text-white/25">Running In Demo Mode</p>
                <p className="mt-3 text-sm leading-6 text-white/45">
                  Live execution data is unavailable until the registry is configured. The runner and visual shell stay available so the workflow can still be previewed.
                </p>
              </div>
            </div>
          </>
        ) : !hasAddress ? (
          <div className="flex flex-col items-center">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#ff7c6f33] bg-[#ff7c6f0d]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="6" width="16" height="12" rx="3" stroke="#ff9f95" strokeWidth="1.5" strokeOpacity="0.6" />
                <path d="M8 12h8" stroke="#ff9f95" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
              </svg>
            </div>
            <p className="text-lg font-semibold tracking-[-0.03em] text-white/80">
              Enter your operator address
            </p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/40">
              Paste the operator wallet address above to load your execution accounts on {CHAIN_NAME}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#ff7c6f33] bg-[#ff7c6f0d]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" stroke="#ff9f95" strokeWidth="1.5" strokeOpacity="0.6" />
                <path d="M9 12h6" stroke="#ff9f95" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
              </svg>
            </div>
            <p className="text-lg font-semibold tracking-[-0.03em] text-white/80">
              No agents found
            </p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/40">
              No execution accounts registered for this operator on {CHAIN_NAME}.
              Run <code className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-sm text-[#ff9f95]">bun run setup</code> to create your first agent wallet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
