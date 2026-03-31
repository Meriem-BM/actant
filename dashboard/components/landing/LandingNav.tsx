import Link from 'next/link'

export default function LandingNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-[#ff7c6f18] bg-[#0b0708]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ff7c6f55] bg-[#ff7c6f14]">
            <span className="text-sm font-semibold text-[#ff9f95]">A</span>
          </div>
          <span className="font-semibold tracking-[-0.03em] text-white">
            Actant
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="#docs"
            className="hidden rounded-full px-4 py-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-white/40 transition-colors hover:text-white sm:block"
          >
            Docs
          </a>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-white/50 transition-colors hover:text-white"
          >
            Dashboard
          </Link>
          <Link
            href="/control"
            className="rounded-full bg-[#ff9f95] px-4 py-1.5 font-mono text-[12px] uppercase tracking-[0.12em] text-[#1a0f11] transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  )
}
