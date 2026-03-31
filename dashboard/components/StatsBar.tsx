'use client'

import { motion } from 'framer-motion'
import type { AgentData } from '@/app/lib/contracts'

interface StatsBarProps {
  agents: AgentData[]
  loading: boolean
}

export default function StatsBar({ agents, loading }: StatsBarProps) {
  const active    = agents.filter(a => a.status === 0).length
  const paused    = agents.filter(a => a.status === 1).length
  const totalSettled = agents.reduce((s, a) => s + parseFloat(a.totalSettled || '0'), 0)
  const totalBalance = agents.reduce((s, a) => s + parseFloat(a.balance || '0'), 0)
  const avgRep    = agents.length
    ? Math.round(agents.reduce((s, a) => s + a.reputationScore, 0) / agents.length)
    : 0
  const totalExec = agents.reduce((s, a) => s + a.executionCount, 0)

  const stats = [
    {
      label: 'Execution Accounts',
      value: loading ? null : String(agents.length),
      sub:   `${active} active${paused ? ` · ${paused} paused` : ''}`,
      accent: false,
    },
    {
      label: 'Total Settled',
      value: loading ? null : `$${totalSettled.toFixed(2)}`,
      sub:   'USDC on Base',
      accent: true,
    },
    {
      label: 'Available Balance',
      value: loading ? null : `$${totalBalance.toFixed(2)}`,
      sub:   'across all wallets',
      accent: false,
    },
    {
      label: 'Avg Reputation',
      value: loading ? null : `${avgRep}%`,
      sub:   `${totalExec} executions · ERC-8004`,
      accent: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="card p-5"
        >
          <p className="eyebrow text-white/30">{stat.label}</p>
          <div className="mt-3">
            {loading || stat.value === null ? (
              <div className="skeleton h-8 w-24" />
            ) : (
              <p className={`text-3xl font-semibold leading-none tracking-[-0.06em] ${stat.accent ? 'text-[#ff9f95]' : 'text-[#f8eeec]'}`}>
                {stat.value}
              </p>
            )}
          </div>
          <p className="mt-2 font-mono text-[13px] text-white/30">{stat.sub}</p>
        </motion.div>
      ))}
    </div>
  )
}
