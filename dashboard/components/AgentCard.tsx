'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia, base } from 'viem/chains'
import { AGENT_REGISTRY_ABI } from '@actant/sdk'
import { REGISTRY_ADDRESS, CHAIN_ID, RPC_URL, addrUrl, EXPLORER } from '@/app/lib/chain'
import type { AgentData } from '@/app/lib/contracts'

const STATUS_LABEL = ['Active', 'Paused', 'Revoked'] as const
const STATUS_CLASS = ['status-active', 'status-paused', 'status-revoked'] as const

interface AgentCardProps {
  agent: AgentData
  index: number
  onRefresh: () => void
}

export default function AgentCard({ agent, index, onRefresh }: AgentCardProps) {
  const [expanded,    setExpanded]    = useState(false)
  const [actionState, setActionState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [actionMsg,   setActionMsg]   = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [privateKey,  setPrivateKey]  = useState('')

  const spentNum  = parseFloat(agent.dailySpent  || '0')
  const limitNum  = parseFloat(agent.dailyLimit  || '1')
  const pct       = Math.min(100, (spentNum / limitNum) * 100)
  const isDanger  = pct >= 85

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

  async function handleLifecycle(action: 'pause' | 'resume') {
    if (!privateKey) {
      setShowKeyInput(true)
      return
    }

    setActionState('loading')
    setActionMsg('')

    try {
      const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}`)
      const walletClient = createWalletClient({
        account,
        chain: CHAIN_ID === 8453 ? base : baseSepolia,
        transport: http(RPC_URL),
      })

      const fnName = action === 'pause' ? 'pauseAgent' : 'resumeAgent'
      const hash = await (walletClient as any).writeContract({
        address: REGISTRY_ADDRESS,
        abi: AGENT_REGISTRY_ABI,
        functionName: fnName,
        args: [agent.agentId],
        chain: CHAIN_ID === 8453 ? base : baseSepolia,
      })

      setActionMsg(`Tx submitted: ${hash}`)
      setActionState('done')
      setPrivateKey('')
      setShowKeyInput(false)
      setTimeout(() => { setActionState('idle'); onRefresh() }, 4000)
    } catch (err) {
      setActionMsg(String(err).slice(0, 120))
      setActionState('error')
      setTimeout(() => setActionState('idle'), 5000)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="card overflow-hidden"
    >
      {/* ── Top bar ── */}
      <div className="flex items-start justify-between gap-4 p-5 md:p-6">
        <div className="min-w-0">
          {/* Agent name derived from last chars of agentId */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ff7c6f33] bg-[#ff7c6f0d] font-mono text-sm font-semibold text-[#ff9f95]">
              {(index + 1).toString().padStart(2, '0')}
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono text-sm text-[#ff9f95]">
                {shortAddr(agent.wallet)}
              </p>
              <p className="truncate font-mono text-[12px] text-white/25">
                id: {shortAddr(agent.agentId)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Status badge */}
          <span className={`rounded-full px-2.5 py-1 font-mono text-[12px] uppercase tracking-[0.14em] ${STATUS_CLASS[agent.status]}`}>
            {STATUS_LABEL[agent.status]}
          </span>
          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/40 transition-colors hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d={expanded ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'}
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Balance + spend row ── */}
      <div className="grid grid-cols-2 gap-px border-t border-[#ff7c6f12]">
        <div className="p-4">
          <p className="eyebrow text-white/25">Balance</p>
          <p className="mt-2 text-xl font-semibold leading-none tracking-[-0.05em] text-[#f8eeec]">
            ${parseFloat(agent.balance).toFixed(2)}
          </p>
          <p className="mt-1 font-mono text-[12px] text-white/25">USDC</p>
        </div>
        <div className="border-l border-[#ff7c6f12] p-4">
          <p className="eyebrow text-white/25">Today&apos;s spend</p>
          <p className={`mt-2 text-xl font-semibold leading-none tracking-[-0.05em] ${isDanger ? 'text-[#ffb16a]' : 'text-[#f8eeec]'}`}>
            ${spentNum.toFixed(2)}
          </p>
          <p className="mt-1 font-mono text-[12px] text-white/25">of ${limitNum.toFixed(0)} limit</p>
        </div>
      </div>

      {/* Spend bar */}
      <div className="px-5 pb-3 pt-2 md:px-6">
        <div className="spend-bar-track">
          <div
            className={`spend-bar-fill ${isDanger ? 'danger' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[12px] text-white/20">
          <span>{pct.toFixed(0)}% of daily cap used</span>
          <span>per-tx: ${parseFloat(agent.perTxLimit).toFixed(2)}</span>
        </div>
      </div>

      {/* ── Expanded details ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-[#ff7c6f12]"
          >
            <div className="space-y-4 p-5 md:p-6">

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="eyebrow text-white/25">Reputation</p>
                  <p className="mt-1.5 text-lg font-semibold tracking-[-0.04em] text-[#f8eeec]">
                    {agent.reputationScore}%
                  </p>
                  <p className="mt-0.5 font-mono text-sm text-white/20">ERC-8004</p>
                </div>
                <div>
                  <p className="eyebrow text-white/25">Executions</p>
                  <p className="mt-1.5 text-lg font-semibold tracking-[-0.04em] text-[#f8eeec]">
                    {agent.executionCount}
                  </p>
                  <p className="mt-0.5 font-mono text-sm text-white/20">on-chain</p>
                </div>
                <div>
                  <p className="eyebrow text-white/25">Total settled</p>
                  <p className="mt-1.5 text-lg font-semibold tracking-[-0.04em] text-[#ff9f95]">
                    ${parseFloat(agent.totalSettled).toFixed(2)}
                  </p>
                  <p className="mt-0.5 font-mono text-sm text-white/20">USDC</p>
                </div>
              </div>

              {/* ERC-8004 Identity Token */}
              <div className="rounded-xl border border-[#9db3ff18] bg-[#9db3ff06] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#9db3ff]/50">
                    ERC-8004 Identity Token
                  </p>
                  {agent.tokenId > 0n && (
                    <span className="rounded-full border border-[#9db3ff22] px-2 py-0.5 font-mono text-sm uppercase tracking-[0.12em] text-[#9db3ff]/60">
                      NFT #{agent.tokenId.toString()}
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[13px] text-[#9db3ff]/70">
                  AgentRegistry · {REGISTRY_ADDRESS ? `${REGISTRY_ADDRESS.slice(0, 10)}…${REGISTRY_ADDRESS.slice(-8)}` : 'not configured'}
                </p>
              </div>

              {/* Addresses */}
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                {[
                  { label: 'ERC-4337 Wallet', value: agent.wallet },
                  { label: 'Operator', value: agent.operator },
                  { label: 'Policy ID', value: agent.agentId },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-white/25 shrink-0">{label}</p>
                    <a
                      href={addrUrl(value)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate font-mono text-[13px] text-white/50 transition-colors hover:text-[#ff9f95]"
                    >
                      {value.slice(0, 10)}…{value.slice(-8)}
                    </a>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-white/25 shrink-0">Last active</p>
                  <p className="font-mono text-[13px] text-white/50">
                    {agent.lastActiveAt.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {agent.status === 0 && (
                  <button
                    onClick={() => handleLifecycle('pause')}
                    disabled={actionState === 'loading'}
                    className="rounded-full border border-[#ffb16a33] bg-[#ffb16a0d] px-4 py-2 font-mono text-[13px] uppercase tracking-[0.12em] text-[#ffb16a] transition-colors hover:border-[#ffb16a55] disabled:opacity-50"
                  >
                    {actionState === 'loading' ? '...' : 'Pause Agent'}
                  </button>
                )}
                {agent.status === 1 && (
                  <button
                    onClick={() => handleLifecycle('resume')}
                    disabled={actionState === 'loading'}
                    className="rounded-full border border-[#7ad8b833] bg-[#7ad8b80d] px-4 py-2 font-mono text-[13px] uppercase tracking-[0.12em] text-[#7ad8b8] transition-colors hover:border-[#7ad8b855] disabled:opacity-50"
                  >
                    {actionState === 'loading' ? '...' : 'Resume Agent'}
                  </button>
                )}
                <a
                  href={`${EXPLORER}/address/${agent.wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/[0.08] px-4 py-2 font-mono text-[13px] uppercase tracking-[0.12em] text-white/40 transition-colors hover:text-white"
                >
                  Basescan ↗
                </a>
              </div>

              {/* Private key input for writes */}
              <AnimatePresence>
                {showKeyInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-[#ffb16a22] bg-[#ffb16a08] p-3">
                      <p className="mb-2 font-mono text-[12px] uppercase tracking-[0.16em] text-[#ffb16a]">
                        Operator Private Key — never stored, stays in browser
                      </p>
                      <input
                        type="password"
                        value={privateKey}
                        onChange={e => setPrivateKey(e.target.value)}
                        placeholder="0x..."
                        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm text-white outline-none focus:border-[#ff7c6f44]"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handleLifecycle(agent.status === 0 ? 'pause' : 'resume')}
                          className="rounded-full bg-[#ff9f95] px-4 py-1.5 font-mono text-[13px] uppercase tracking-[0.1em] text-[#1a0f11]"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => { setShowKeyInput(false); setPrivateKey('') }}
                          className="font-mono text-[13px] text-white/30 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action feedback */}
              <AnimatePresence>
                {actionMsg && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`font-mono text-[13px] leading-5 ${actionState === 'error' ? 'text-[#ff7f7f]' : 'text-[#7ad8b8]'}`}
                  >
                    {actionMsg}
                  </motion.p>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
