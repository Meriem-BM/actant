import FadeIn from './FadeIn'

const STEPS = [
  {
    n: '01',
    title: 'Deploy',
    color: '#ff9f95',
    border: '#ff7c6f33',
    bg: '#ff7c6f0d',
    body: 'One transaction deploys an ERC-4337 smart account and registers it in AgentRegistry with an ERC-8004 identity.',
  },
  {
    n: '02',
    title: 'Configure',
    color: '#ffb16a',
    border: '#ffb16a33',
    bg: '#ffb16a0d',
    body: 'Set daily and per-transaction USDC limits. Optionally restrict payments to an allowlist of recipient addresses.',
  },
  {
    n: '03',
    title: 'Pay',
    color: '#7ad8b8',
    border: '#7ad8b833',
    bg: '#7ad8b80d',
    body: 'Your agent calls pay() via the SDK. The EntryPoint validates the UserOp, enforces limits, and settles USDC on-chain.',
  },
] as const

export default function LandingHowItWorks() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
      <FadeIn>
        <p className="eyebrow mb-10 text-white/30">How it works</p>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <FadeIn key={step.n} delay={index * 0.08}>
            <div
              className="h-full rounded-2xl border p-6"
              style={{
                borderColor: step.border,
                background: `${step.bg}66`,
              }}
            >
              <div
                className="mb-4 flex h-9 w-9 items-center justify-center rounded-full border font-mono text-[13px] font-semibold"
                style={{ borderColor: step.border, color: step.color }}
              >
                {step.n}
              </div>
              <p
                className="mb-2 font-semibold tracking-[-0.02em] text-white"
                style={{ color: step.color }}
              >
                {step.title}
              </p>
              <p className="text-sm leading-relaxed text-white/45">{step.body}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
