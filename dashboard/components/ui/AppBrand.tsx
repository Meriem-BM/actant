import Link from 'next/link'

interface AppBrandProps {
  subtitle?: string
  href?: string
  showSubtitle?: boolean
  className?: string
}

function BrandContent({ subtitle, showSubtitle = true }: Pick<AppBrandProps, 'subtitle' | 'showSubtitle'>) {
  return (
    <>
      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ff7c6f55] bg-[#ff7c6f14]">
        <span className="text-sm font-semibold text-[#ff9f95]">A</span>
      </div>

      <div className={showSubtitle ? 'hidden sm:block' : ''}>
        <p className="text-sm font-semibold leading-none tracking-[-0.04em] text-white">
          Actant
        </p>
        {subtitle && (
          <p className="mt-0.5 font-mono text-[12px] uppercase tracking-[0.18em] text-white/30">
            {subtitle}
          </p>
        )}
      </div>
    </>
  )
}

export default function AppBrand({
  subtitle,
  href,
  showSubtitle = true,
  className,
}: AppBrandProps) {
  const classes = `flex shrink-0 items-center gap-3 ${className ?? ''}`.trim()

  if (href) {
    return (
      <Link href={href} className={`${classes} transition-opacity hover:opacity-80`}>
        <BrandContent subtitle={subtitle} showSubtitle={showSubtitle} />
      </Link>
    )
  }

  return (
    <div className={classes}>
      <BrandContent subtitle={subtitle} showSubtitle={showSubtitle} />
    </div>
  )
}
