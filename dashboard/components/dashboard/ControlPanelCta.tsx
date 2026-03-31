import Link from 'next/link'

export default function ControlPanelCta() {
  return (
    <Link
      href="/control"
      className="group flex items-center justify-between rounded-2xl border border-[#ff7c6f18] bg-[rgba(30,16,20,0.4)] px-5 py-4 transition-all hover:border-[#ff7c6f33] hover:bg-[rgba(30,16,20,0.6)]"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ff7c6f33] bg-[#ff7c6f0d]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="#ff9f95" strokeWidth="1.2" />
            <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="#ff9f95" strokeWidth="1.2" />
            <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="#ff9f95" strokeWidth="1.2" />
            <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="#ff9f95" strokeWidth="1.2" />
          </svg>
        </div>
        <div>
          <p className="font-semibold tracking-[-0.02em] text-white/80 transition-colors group-hover:text-white">
            Control Panel
          </p>
          <p className="mt-0.5 font-mono text-[12px] text-white/30">
            Deploy agent wallets · set spend limits · fund gas
          </p>
        </div>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className="shrink-0 text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-[#ff9f95]"
      >
        <path
          d="M3 8h10M9 4l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  )
}
