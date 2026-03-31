import CodeBlock from './CodeBlock'
import FadeIn from './FadeIn'

const ARCHITECTURE_DIAGRAM = `┌─ Operator (you) ────────────────────────────────────────────┐
│
│  Deploy & configure via Actant Dashboard
│
│        ↓  createWallet(agentId, limits, manifestHash)
│
│  AgentWalletFactory ──── CREATE2 ────► AgentWallet (ERC-4337)
│                                              │
│                         registers ──────────► AgentRegistry (ERC-8004)
│
└─────────────────────────────────────────────────────────────┘

┌─ Agent (your AI / script) ──────────────────────────────────┐
│
│  wallet.pay({ to, amount, memo })
│        │
│        ↓  eth_sendUserOperation
│
│  Bundler (Pimlico) ────► EntryPoint (ERC-4337)
│                                │
│                    validateUserOp() on AgentWallet
│                          check limits, owner signature
│                                │
│                      ► pay(to, amount) → USDC transfer
│                      ► logExecution() in AgentRegistry
│
└─────────────────────────────────────────────────────────────┘`

const CARDS = [
  {
    label: 'AgentWalletFactory',
    desc: 'Deploys wallets deterministically via CREATE2 and predicts addresses before deployment.',
  },
  {
    label: 'AgentWallet',
    desc: 'ERC-4337 smart account that validates UserOps and enforces spend policies.',
  },
  {
    label: 'AgentRegistry',
    desc: 'ERC-8004 identity and execution state registry for each agent.',
  },
] as const

export default function LandingArchitecture() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
      <FadeIn>
        <p className="eyebrow mb-2 text-white/30">Architecture</p>
        <h2 className="mb-8 text-2xl font-semibold tracking-[-0.03em] text-white">
          How the pieces fit
        </h2>
      </FadeIn>

      <FadeIn delay={0.05}>
        <CodeBlock>{ARCHITECTURE_DIAGRAM}</CodeBlock>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {CARDS.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <p className="mb-1 font-mono text-[12px] text-[#ff9f95]">
                {card.label}
              </p>
              <p className="text-sm leading-relaxed text-white/40">{card.desc}</p>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  )
}
