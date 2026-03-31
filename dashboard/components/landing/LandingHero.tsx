import Link from 'next/link'
import FadeIn from './FadeIn'

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px]">
        <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(255,124,111,0.12),transparent_68%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 pb-24 pt-20 sm:px-6 sm:pt-28">
        <FadeIn>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ff7c6f22] bg-[#ff7c6f0a] px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff9f95]" />
            <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#ff9f95]/70">
              Base · ERC-4337 · ERC-8004
            </span>
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.1] tracking-[-0.04em] text-white sm:text-6xl">
            The payment layer for{' '}
            <span className="text-[#ff9f95]">autonomous AI</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.1}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/50">
            Every agent gets its own smart wallet with programmable spend limits,
            on-chain identity, and a USDC payment rail. No human in the loop.
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/control"
              className="flex items-center gap-2 rounded-full bg-[#ff9f95] px-6 py-3 font-mono text-[13px] uppercase tracking-[0.12em] text-[#1a0f11] transition-opacity hover:opacity-90"
            >
              Deploy an Agent
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

            <a
              href="#quickstart"
              className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-6 py-3 font-mono text-[13px] uppercase tracking-[0.12em] text-white/50 transition-colors hover:text-white"
            >
              View SDK docs
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
