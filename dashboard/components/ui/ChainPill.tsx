interface ChainPillProps {
  label: string
  live?: boolean
  showLabelOnMobile?: boolean
  dotClassName?: string
}

export default function ChainPill({
  label,
  live = false,
  showLabelOnMobile = false,
  dotClassName,
}: ChainPillProps) {
  const defaultDotClass = live ? 'bg-[#7ad8b8] live-dot' : 'bg-[#ff9f95]'

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClassName ?? defaultDotClass}`} />
      <span
        className={`font-mono text-[12px] uppercase tracking-[0.14em] text-white/40 ${showLabelOnMobile ? '' : 'hidden sm:block'}`}
      >
        {label}
      </span>
    </div>
  )
}
