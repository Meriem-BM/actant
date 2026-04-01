'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createWalletClient, custom, type Account } from 'viem'
import { AgentWallet, buildManifest } from '@atactant/sdk'
import { useWallets } from '@privy-io/react-auth'
import {
  REGISTRY_ADDRESS,
  FACTORY_ADDRESS,
  CHAIN,
  CHAIN_ID,
  RPC_URL,
  EXPLORER,
} from '@/app/lib/chain'
import { shortAddress } from '@/app/lib/format'
import type { AgentData } from '@/app/lib/contracts'

const STATUS_LABEL = ['Active', 'Paused', 'Revoked'] as const
const STATUS_CLASS  = ['status-active', 'status-paused', 'status-revoked'] as const

type ActionState = 'idle' | 'loading' | 'done' | 'error'
type PanelMode   = null | 'lifecycle' | 'limits' | 'manifest' | 'revoke'

interface AgentCardProps {
  agent:     AgentData
  index:     number
  onRefresh: () => void
}

// ── Privy-aware action runner ─────────────────────────────────────────────────

function AgentCardInner({ agent, index, onRefresh }: AgentCardProps) {
  const { wallets } = useWallets()

  const [expanded,    setExpanded]    = useState(false)
  const [panel,       setPanel]       = useState<PanelMode>(null)
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [actionMsg,   setActionMsg]   = useState('')
  const [newDaily,    setNewDaily]    = useState(parseFloat(agent.dailyLimit  || '50').toFixed(2))
  const [newPerTx,    setNewPerTx]    = useState(parseFloat(agent.perTxLimit  || '5').toFixed(2))
  const [newManifestHash, setNewManifestHash] = useState('')

  const spentNum = parseFloat(agent.dailySpent || '0')
  const limitNum = parseFloat(agent.dailyLimit  || '1')
  const pct      = Math.min(100, (spentNum / limitNum) * 100)
  const isDanger = pct >= 85

  async function getSdkWallet(): Promise<AgentWallet> {
    const wallet = wallets[0]
    if (!wallet) throw new Error('No wallet connected. Use the Connect Wallet button in the header.')
    await wallet.switchChain(CHAIN_ID)
    const provider = await wallet.getEthereumProvider()
    const wc = createWalletClient({
      account:   wallet.address as `0x${string}`,
      chain:     CHAIN,
      transport: custom(provider),
    })
    const manifest = buildManifest({
      agentId:     agent.agentId,
      name:        agent.agentId.slice(0, 16),
      description: 'Loaded from dashboard',
      operator:    agent.operator,
      wallet:      agent.wallet,
      chainId:     CHAIN_ID,
      config:      { name: 'agent', spendingLimit: { daily: agent.dailyLimit, perTx: agent.perTxLimit } },
    })
    return AgentWallet.fromAddress(agent.wallet, agent.agentId, manifest, {
      account:              wc.account as Account,
      externalWalletClient: wc,
      chainId:              CHAIN_ID,
      rpcUrl:               RPC_URL,
      factory:              FACTORY_ADDRESS as `0x${string}`,
      registry:             REGISTRY_ADDRESS as `0x${string}`,
    })
  }

  async function run(label: string, fn: (w: AgentWallet) => Promise<`0x${string}`>) {
    setActionState('loading')
    setActionMsg('')
    try {
      const w    = await getSdkWallet()
      const hash = await fn(w)
      setActionMsg(`${label} · tx: ${hash.slice(0, 18)}…`)
      setActionState('done')
      setPanel(null)
      setTimeout(() => { setActionState('idle'); setActionMsg(''); onRefresh() }, 4000)
    } catch (err) {
      setActionMsg(String(err).slice(0, 160))
      setActionState('error')
      setTimeout(() => setActionState('idle'), 6000)
    }
  }

  const handlePause  = () => run('Paused',  w => w.pause())
  const handleResume = () => run('Resumed', w => w.resume())
  const handleRevoke = () => run('Revoked', w => w.revoke())

  async function handleUpdateLimits() {
    run('Limits updated', w => w.updateLimits(newDaily, newPerTx))
  }

  async function handleUpdateManifest() {
    if (!newManifestHash.startsWith('0x') || newManifestHash.length !== 66) {
      setActionMsg('Invalid hash. Must be 0x followed by 64 hex chars')
      setActionState('error')
      setTimeout(() => setActionState('idle'), 4000)
      return
    }
    run('Manifest updated', w => w.updateManifest(newManifestHash as `0x${string}`))
  }

  // Confirm button used in action panels
  const ConfirmButton = ({ label, onConfirm }: { label: string; onConfirm: () => void }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={onConfirm}
        disabled={actionState === 'loading'}
        className="rounded-full bg-[#ff9f95] px-4 py-1.5 font-mono text-[13px] uppercase tracking-[0.1em] text-[#1a0f11] disabled:opacity-50"
      >
        {actionState === 'loading' ? '…' : label}
      </button>
      <button
        onClick={() => setPanel(null)}
        className="font-mono text-[13px] text-white/30 hover:text-white"
      >
        Cancel
      </button>
    </div>
  )

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
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ff7c6f33] bg-[#ff7c6f0d] font-mono text-sm font-semibold text-[#ff9f95]">
              {(index + 1).toString().padStart(2, '0')}
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono text-sm text-[#ff9f95]">{shortAddress(agent.wallet)}</p>
              <p className="truncate font-mono text-[12px] text-white/25">id: {shortAddress(agent.agentId)}</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 font-mono text-[12px] uppercase tracking-[0.14em] ${STATUS_CLASS[agent.status]}`}>
            {STATUS_LABEL[agent.status]}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/40 transition-colors hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d={expanded ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Balances ── */}
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
          <div className={`spend-bar-fill ${isDanger ? 'danger' : ''}`} style={{ width: `${pct}%` }} />
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

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="eyebrow text-white/25">Reputation</p>
                  <p className="mt-1.5 text-lg font-semibold tracking-[-0.04em] text-[#f8eeec]">{agent.reputationScore}%</p>
                  <p className="mt-0.5 font-mono text-sm text-white/20">ERC-8004</p>
                </div>
                <div>
                  <p className="eyebrow text-white/25">Executions</p>
                  <p className="mt-1.5 text-lg font-semibold tracking-[-0.04em] text-[#f8eeec]">{agent.executionCount}</p>
                  <p className="mt-0.5 font-mono text-sm text-white/20">on-chain</p>
                </div>
                <div>
                  <p className="eyebrow text-white/25">Total settled</p>
                  <p className="mt-1.5 text-lg font-semibold tracking-[-0.04em] text-[#ff9f95]">${parseFloat(agent.totalSettled).toFixed(2)}</p>
                  <p className="mt-0.5 font-mono text-sm text-white/20">USDC</p>
                </div>
              </div>

              {/* Manifest hash */}
              <div className="rounded-xl border border-[#9db3ff18] bg-[#9db3ff06] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#9db3ff]/50">ERC-8004 Manifest Hash</p>
                  <button
                    onClick={() => setPanel(panel === 'manifest' ? null : 'manifest')}
                    className="font-mono text-[12px] text-[#9db3ff]/40 hover:text-[#9db3ff] transition-colors"
                  >
                    Rotate ↗
                  </button>
                </div>
                <p className="mt-1 break-all font-mono text-[12px] text-[#9db3ff]/60">{agent.manifestHash}</p>
                <p className="mt-1 font-mono text-[12px] text-white/20">
                  Registry: {REGISTRY_ADDRESS ? `${REGISTRY_ADDRESS.slice(0, 10)}…` : 'not configured'}
                </p>
              </div>

              {/* Addresses — Agent ID is NOT a link (it's a hash, not an address) */}
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                {[
                  { label: 'ERC-4337 Wallet', value: agent.wallet,   link: true  },
                  { label: 'Operator',         value: agent.operator, link: true  },
                  { label: 'Agent ID',          value: agent.agentId,  link: false },
                ].map(({ label, value, link }) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-white/25 shrink-0">{label}</p>
                    {link ? (
                      <a href={`${EXPLORER}/address/${value}`} target="_blank" rel="noopener noreferrer"
                        className="truncate font-mono text-[13px] text-white/50 transition-colors hover:text-[#ff9f95]">
                        {value.slice(0, 10)}…{value.slice(-8)}
                      </a>
                    ) : (
                      <p className="truncate font-mono text-[13px] text-white/40 select-all">
                        {value.slice(0, 10)}…{value.slice(-8)}
                      </p>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-white/25 shrink-0">Last active</p>
                  <p className="font-mono text-[13px] text-white/50">{agent.lastActiveAt.toLocaleString()}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {agent.status === 0 && (
                  <button onClick={() => setPanel('lifecycle')} disabled={actionState === 'loading'}
                    className="rounded-full border border-[#ffb16a33] bg-[#ffb16a0d] px-4 py-2 font-mono text-[13px] uppercase tracking-[0.12em] text-[#ffb16a] transition-colors hover:border-[#ffb16a55] disabled:opacity-50">
                    {actionState === 'loading' ? '…' : 'Pause Agent'}
                  </button>
                )}
                {agent.status === 1 && (
                  <button onClick={() => setPanel('lifecycle')} disabled={actionState === 'loading'}
                    className="rounded-full border border-[#7ad8b833] bg-[#7ad8b80d] px-4 py-2 font-mono text-[13px] uppercase tracking-[0.12em] text-[#7ad8b8] transition-colors hover:border-[#7ad8b855] disabled:opacity-50">
                    {actionState === 'loading' ? '…' : 'Resume Agent'}
                  </button>
                )}
                {agent.status !== 2 && (
                  <button onClick={() => setPanel(panel === 'limits' ? null : 'limits')}
                    className="rounded-full border border-white/[0.08] px-4 py-2 font-mono text-[13px] uppercase tracking-[0.12em] text-white/40 transition-colors hover:text-white">
                    Update Limits
                  </button>
                )}
                <a href={`${EXPLORER}/address/${agent.wallet}`} target="_blank" rel="noopener noreferrer"
                  className="rounded-full border border-white/[0.08] px-4 py-2 font-mono text-[13px] uppercase tracking-[0.12em] text-white/40 transition-colors hover:text-white">
                  Basescan ↗
                </a>
                {agent.status !== 2 && (
                  <button onClick={() => setPanel(panel === 'revoke' ? null : 'revoke')}
                    className="rounded-full border border-[#ff7f7f22] px-4 py-2 font-mono text-[13px] uppercase tracking-[0.12em] text-[#ff7f7f]/60 transition-colors hover:border-[#ff7f7f44] hover:text-[#ff7f7f]">
                    Revoke
                  </button>
                )}
              </div>

              {/* Action panels */}
              <AnimatePresence>
                {panel === 'lifecycle' && (
                  <motion.div key="lifecycle" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-xl border border-[#ffb16a22] bg-[#ffb16a06] p-3 space-y-2">
                      <p className="font-mono text-[12px] text-white/40">
                        This will send a transaction from your connected wallet.
                      </p>
                      <ConfirmButton label={agent.status === 0 ? 'Pause Agent' : 'Resume Agent'} onConfirm={agent.status === 0 ? handlePause : handleResume} />
                    </div>
                  </motion.div>
                )}

                {panel === 'limits' && (
                  <motion.div key="limits" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-3">
                      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-white/40">Update Spend Policy</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block font-mono text-[12px] text-white/30">Daily limit (USDC)</label>
                          <input type="number" value={newDaily} onChange={e => setNewDaily(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm text-white outline-none focus:border-[#ff7c6f44]" />
                        </div>
                        <div>
                          <label className="mb-1 block font-mono text-[12px] text-white/30">Per-tx limit (USDC)</label>
                          <input type="number" value={newPerTx} onChange={e => setNewPerTx(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm text-white outline-none focus:border-[#ff7c6f44]" />
                        </div>
                      </div>
                      <ConfirmButton label="Update Limits" onConfirm={handleUpdateLimits} />
                    </div>
                  </motion.div>
                )}

                {panel === 'manifest' && (
                  <motion.div key="manifest" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-xl border border-[#9db3ff18] bg-[#9db3ff06] p-3 space-y-3">
                      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#9db3ff]/50">Rotate Capability Manifest</p>
                      <p className="font-mono text-[12px] text-white/30">Paste the keccak256 hash of your updated agent.json manifest</p>
                      <input type="text" value={newManifestHash} onChange={e => setNewManifestHash(e.target.value)}
                        placeholder="0x..." className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-sm text-white outline-none focus:border-[#9db3ff33]" />
                      <ConfirmButton label="Update Manifest" onConfirm={handleUpdateManifest} />
                    </div>
                  </motion.div>
                )}

                {panel === 'revoke' && (
                  <motion.div key="revoke" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-xl border border-[#ff7f7f22] bg-[#ff7f7f06] p-3 space-y-3">
                      <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#ff7f7f]">⚠ Permanent Revocation</p>
                      <p className="text-sm text-white/50 leading-relaxed">
                        This permanently marks the agent as revoked in AgentRegistry. The wallet will be blocked from all future payments. This cannot be undone.
                      </p>
                      <ConfirmButton label="Revoke Permanently" onConfirm={handleRevoke} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action feedback */}
              <AnimatePresence>
                {actionMsg && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={`font-mono text-[13px] leading-5 break-all ${actionState === 'error' ? 'text-[#ff7f7f]' : 'text-[#7ad8b8]'}`}>
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

// ── public export — gracefully degrade when Privy not configured ──────────────

export default function AgentCard(props: AgentCardProps) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    // Privy not configured: render card read-only (no action buttons)
    return <AgentCardReadOnly {...props} />
  }
  return <AgentCardInner {...props} />
}

// ── read-only fallback ────────────────────────────────────────────────────────

function AgentCardReadOnly({ agent, index }: AgentCardProps) {
  const spentNum  = parseFloat(agent.dailySpent || '0')
  const limitNum  = parseFloat(agent.dailyLimit  || '1')
  const pct       = Math.min(100, (spentNum / limitNum) * 100)
  const isDanger  = pct >= 85

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="card overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4 p-5 md:p-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ff7c6f33] bg-[#ff7c6f0d] font-mono text-sm font-semibold text-[#ff9f95]">
              {(index + 1).toString().padStart(2, '0')}
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono text-sm text-[#ff9f95]">{shortAddress(agent.wallet)}</p>
              <p className="truncate font-mono text-[12px] text-white/25">id: {shortAddress(agent.agentId)}</p>
            </div>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 font-mono text-[12px] uppercase tracking-[0.14em] ${STATUS_CLASS[agent.status]}`}>
          {STATUS_LABEL[agent.status]}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-[#ff7c6f12]">
        <div className="p-4">
          <p className="eyebrow text-white/25">Balance</p>
          <p className="mt-2 text-xl font-semibold leading-none tracking-[-0.05em] text-[#f8eeec]">${parseFloat(agent.balance).toFixed(2)}</p>
          <p className="mt-1 font-mono text-[12px] text-white/25">USDC</p>
        </div>
        <div className="border-l border-[#ff7c6f12] p-4">
          <p className="eyebrow text-white/25">Today&apos;s spend</p>
          <p className={`mt-2 text-xl font-semibold leading-none tracking-[-0.05em] ${isDanger ? 'text-[#ffb16a]' : 'text-[#f8eeec]'}`}>${spentNum.toFixed(2)}</p>
          <p className="mt-1 font-mono text-[12px] text-white/25">of ${limitNum.toFixed(0)} limit</p>
        </div>
      </div>
      <div className="px-5 pb-3 pt-2 md:px-6">
        <div className="spend-bar-track">
          <div className={`spend-bar-fill ${isDanger ? 'danger' : ''}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </motion.div>
  )
}
