import CodeBlock from './CodeBlock'
import FadeIn from './FadeIn'

const INSTALL_CODE = 'npm install @atactant/sdk'

const DEPLOY_CODE = `import { AgentWallet } from '@atactant/sdk'
import { createWalletClient, custom } from 'viem'
import { useWallets } from '@privy-io/react-auth'

const { wallets } = useWallets()
const wallet = wallets[0]
const provider = await wallet.getEthereumProvider()
const walletClient = createWalletClient({
  account: wallet.address,
  chain: CHAIN,
  transport: custom(provider),
})

const { wallet: agentWallet } = await AgentWallet.create(
  {
    name: 'research-agent',
    spendingLimit: { daily: '50.00', perTx: '5.00' },
  },
  {
    account: walletClient.account,
    externalWalletClient: walletClient,
    factory: FACTORY_ADDRESS,
    registry: REGISTRY_ADDRESS,
    chainId: 84532,
  }
)

console.log(agentWallet.walletAddress)`

const PAY_CODE = `const receipt = await wallet.pay({
  to: '0xApiService…',
  amount: '0.10',
  memo: 'market-data-feed',
})`

export default function LandingQuickStart() {
  return (
    <section id="quickstart" className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
      <FadeIn>
        <p className="eyebrow mb-2 text-white/30">Quick start</p>
        <h2 className="mb-10 text-2xl font-semibold tracking-[-0.03em] text-white">
          Up in 3 steps
        </h2>
      </FadeIn>

      <div className="space-y-4">
        <FadeIn>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.14em] text-white/30">
              1. Install
            </p>
            <CodeBlock language="bash">{INSTALL_CODE}</CodeBlock>
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.14em] text-white/30">
              2. Deploy an agent wallet
            </p>
            <CodeBlock language="ts">{DEPLOY_CODE}</CodeBlock>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.14em] text-white/30">
              3. Make a payment
            </p>
            <CodeBlock language="ts">{PAY_CODE}</CodeBlock>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
