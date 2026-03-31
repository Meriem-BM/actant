'use client'

import { motion } from 'framer-motion'
import { txUrl } from '@/app/lib/chain'
import { shortAddress } from '@/app/lib/format'
import type { ExecutionEvent, AgentData } from '@/app/lib/contracts'

interface ExecutionFeedProps {
  events:  ExecutionEvent[]
  agents:  AgentData[]
  loading: boolean
}

function timeAgo(blockNumber: bigint): string {
  // Without real block timestamps, approximate from block number
  // (Base Sepolia ~2s per block)
  return `block ${blockNumber.toLocaleString()}`
}

export default function ExecutionFeed({ events, agents, loading }: ExecutionFeedProps) {
  const agentMap = new Map(agents.map(a => [a.agentId.toLowerCase(), a]))

  return (
    <div className="card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#ff7c6f12] px-5 py-4">
        <div>
          <p className="eyebrow text-white/30">Execution Feed</p>
          <p className="mt-1 text-sm font-medium tracking-[-0.02em] text-white/80">
            Recent on-chain settlements
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[#7ad8b822] bg-[#7ad8b80d] px-3 py-1">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#7ad8b8]" />
          <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#7ad8b8]">Live</span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: '60vh' }}>
        {loading ? (
          <div className="space-y-px p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                <div className="skeleton h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-32" />
                  <div className="skeleton h-2.5 w-48" />
                </div>
                <div className="skeleton h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#ff7c6f22] bg-[#ff7c6f08]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="#ff9f95" strokeWidth="1.5" strokeOpacity="0.5" />
                <path d="M10 6v4.5l3 1.5" stroke="#ff9f95" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
              </svg>
            </div>
            <p className="font-mono text-sm text-white/30">No executions yet</p>
            <p className="mt-1 text-sm text-white/20">Settlements will appear here as agents run</p>
          </div>
        ) : (
          <div className="space-y-px p-2">
            {events.map((event, i) => {
              const agent = agentMap.get(event.agentId.toLowerCase())
              const amount = parseFloat(event.amountSettled || '0')
              const isMockTx = event.txHash.startsWith('0xdead')

              return (
                <motion.div
                  key={`${event.txHash}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.03]"
                >
                  {/* Status dot */}
                  <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${event.success ? 'bg-[#7ad8b8]' : 'bg-[#ff7f7f]'}`} />

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-mono text-[13px] text-white/50">
                        {agent ? shortAddress(agent.wallet) : shortAddress(event.agentId)}
                      </p>
                      <span className="text-white/15">→</span>
                      <span className="font-mono text-[13px] text-white/30">settled</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="font-mono text-[12px] text-white/20">
                        {timeAgo(event.blockNumber)}
                      </p>
                      {!isMockTx && (
                        <a
                          href={txUrl(event.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[12px] text-white/20 opacity-0 transition-opacity hover:text-[#ff9f95] group-hover:opacity-100"
                        >
                          {shortAddress(event.txHash)} ↗
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="shrink-0 text-right">
                    {amount > 0 ? (
                      <p className={`font-mono text-sm font-medium tabular-nums ${event.success ? 'text-[#7ad8b8]' : 'text-[#ff7f7f]'}`}>
                        ${amount.toFixed(2)}
                      </p>
                    ) : (
                      <p className="font-mono text-sm text-[#ff7f7f]">failed</p>
                    )}
                    <p className="font-mono text-sm text-white/20">USDC</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#ff7c6f12] px-5 py-3">
        <p className="font-mono text-[12px] text-white/20">
          {events.length > 0
            ? `Showing ${events.length} most recent · giveFeedback() logged to ERC-8004 Reputation Registry`
            : 'Each settlement calls giveFeedback() on ERC-8004 Reputation Registry · 0x8004BAa1…9b63'}
        </p>
      </div>
    </div>
  )
}
