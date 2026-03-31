import Link from 'next/link'
import FadeIn from './FadeIn'

const FOOTER_ITEMS = [
  'ERC-4337 Account Abstraction',
  'ERC-8004 Agent Identity',
  'USDC on Base L2',
  'Pimlico Bundler',
] as const

export default function LandingCta() {
  return (
    <section className="mx-auto max-w-5xl px-5 pb-24 pt-8 sm:px-6">
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl border border-[#ff7c6f22] bg-[#ff7c6f08] p-10 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(255,124,111,0.15),transparent_70%)]" />

          <div className="relative">
            <p className="mb-3 text-2xl font-semibold tracking-[-0.03em] text-white">
              Ready to give your agent a wallet?
            </p>
            <p className="mx-auto mb-8 max-w-sm text-sm text-white/40">
              Connect your wallet, deploy an agent account, and make your first
              on-chain payment in minutes.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/control"
                className="flex items-center gap-2 rounded-full bg-[#ff9f95] px-6 py-3 font-mono text-[13px] uppercase tracking-[0.12em] text-[#1a0f11] transition-opacity hover:opacity-90"
              >
                Open Control Panel
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M3 7h8M7 3l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>

              <Link
                href="/dashboard"
                className="rounded-full border border-white/[0.1] bg-white/[0.04] px-6 py-3 font-mono text-[13px] uppercase tracking-[0.12em] text-white/50 transition-colors hover:text-white"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 font-mono text-[12px] text-white/20">
          {FOOTER_ITEMS.map((item, index) => (
            <div key={item} className="flex items-center gap-6">
              {index > 0 && <span className="text-white/10">·</span>}
              <span>{item}</span>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  )
}
