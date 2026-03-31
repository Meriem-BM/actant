import FadeIn from './FadeIn'

type SdkParam = {
  name: string
  type: string
  desc: string
}

type SdkItem = {
  sig: string
  ret: string
  desc: string
  params: SdkParam[]
}

const SDK_ITEMS: SdkItem[] = [
  {
    sig: 'AgentWallet.create(config, client)',
    ret: 'Promise<{ wallet, response }>',
    desc: 'Deploy a new ERC-4337 smart account and register it in AgentRegistry. Returns the wallet instance and deployment receipt.',
    params: [
      {
        name: 'config.name',
        type: 'string',
        desc: 'Human-readable agent name used to derive the agentId.',
      },
      {
        name: 'config.spendingLimit',
        type: '{ daily, perTx }',
        desc: 'USDC limits as human-readable strings.',
      },
      {
        name: 'config.allowedRecipients',
        type: 'address[]',
        desc: 'Optional allowlist. When set, pay() rejects all others.',
      },
      {
        name: 'client.account',
        type: 'Account',
        desc: 'Viem account that signs deployment.',
      },
      {
        name: 'client.bundlerUrl',
        type: 'string?',
        desc: 'ERC-4337 bundler endpoint. If omitted, direct contract calls are used.',
      },
    ],
  },
  {
    sig: 'AgentWallet.fromAddress(wallet, agentId, manifest, client)',
    ret: 'AgentWallet',
    desc: 'Load an existing wallet by address for long-running agent services.',
    params: [
      {
        name: 'wallet',
        type: 'address',
        desc: 'The deployed ERC-4337 smart account address.',
      },
      {
        name: 'agentId',
        type: 'bytes32',
        desc: 'On-chain agent identifier.',
      },
      {
        name: 'manifest',
        type: 'AgentManifest',
        desc: 'Capability manifest built from buildManifest().',
      },
    ],
  },
  {
    sig: 'wallet.pay(request)',
    ret: 'Promise<PaymentResponse>',
    desc: 'Settle a USDC payment from the wallet with spend-policy checks.',
    params: [
      {
        name: 'request.to',
        type: 'address',
        desc: 'Recipient address.',
      },
      {
        name: 'request.amount',
        type: 'string',
        desc: 'USDC amount as a human-readable string.',
      },
      {
        name: 'request.memo',
        type: 'string?',
        desc: 'Optional memo emitted in events.',
      },
    ],
  },
  {
    sig: 'wallet.depositGas(amountEth)',
    ret: 'Promise<txHash>',
    desc: 'Fund gas with ETH for future UserOperations.',
    params: [
      {
        name: 'amountEth',
        type: 'string',
        desc: 'ETH amount as a string.',
      },
    ],
  },
  {
    sig: 'wallet.getBalance()',
    ret: 'Promise<string>',
    desc: 'Read current USDC balance for the wallet.',
    params: [],
  },
  {
    sig: 'wallet.pause() / resume() / revoke()',
    ret: 'Promise<txHash>',
    desc: 'Lifecycle controls on AgentRegistry. revoke() is permanent.',
    params: [],
  },
  {
    sig: 'wallet.updateLimits(daily, perTx)',
    ret: 'Promise<txHash>',
    desc: 'Update on-chain spending limits immediately.',
    params: [
      {
        name: 'daily',
        type: 'string',
        desc: 'New daily USDC cap.',
      },
      {
        name: 'perTx',
        type: 'string',
        desc: 'New per-transaction USDC cap.',
      },
    ],
  },
]

export default function LandingSdkReference() {
  return (
    <section id="docs" className="mx-auto max-w-5xl px-5 py-16 sm:px-6">
      <FadeIn>
        <p className="eyebrow mb-2 text-white/30">SDK Reference</p>
        <h2 className="mb-10 text-2xl font-semibold tracking-[-0.03em] text-white">
          Core API
        </h2>
      </FadeIn>

      <div className="space-y-3">
        {SDK_ITEMS.map((item, index) => (
          <FadeIn key={item.sig} delay={index * 0.04}>
            <details className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] open:border-[#ff7c6f22]">
              <summary className="list-none flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <code className="font-mono text-[13px] text-[#ff9f95]">
                    {item.sig}
                  </code>
                  <span className="ml-3 font-mono text-[12px] text-white/25">
                    → {item.ret}
                  </span>
                </div>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="shrink-0 text-white/25 transition-transform group-open:rotate-180"
                >
                  <path
                    d="M2 4l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>

              <div className="space-y-4 border-t border-white/[0.05] px-5 py-4">
                <p className="text-sm leading-relaxed text-white/50">{item.desc}</p>

                {item.params.length > 0 && (
                  <div className="space-y-2">
                    {item.params.map((param) => (
                      <div
                        key={param.name}
                        className="grid grid-cols-[180px_1fr] gap-3 text-sm"
                      >
                        <code className="font-mono text-[12px] text-[#82aaff]">
                          {param.name}
                        </code>
                        <span className="leading-relaxed text-white/40">
                          <span className="mr-2 font-mono text-[12px] text-[#ffcb6b]">
                            {param.type}
                          </span>
                          {param.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
