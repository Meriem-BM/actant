import CodeBlock from './CodeBlock'
import FadeIn from './FadeIn'

const X402_CODE = `const fetch = wallet.getX402Fetch()

const data = await fetch('https://api.someservice.io/v1/prices')
const json = await data.json()`

export default function LandingX402() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
      <FadeIn>
        <p className="eyebrow mb-2 text-white/30">x402 Protocol</p>
        <h2 className="mb-4 text-2xl font-semibold tracking-[-0.03em] text-white">
          Pay-per-call HTTP APIs
        </h2>
        <p className="mb-8 max-w-xl text-sm leading-relaxed text-white/45">
          Use{' '}
          <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-[#ff9f95]">
            getX402Fetch()
          </code>{' '}
          to handle 402 Payment Required responses automatically.
        </p>
      </FadeIn>

      <FadeIn delay={0.05}>
        <CodeBlock>{X402_CODE}</CodeBlock>
      </FadeIn>
    </section>
  )
}
