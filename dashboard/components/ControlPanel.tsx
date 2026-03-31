'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPublicClient, createWalletClient, custom, http, formatEther, type Account } from 'viem'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { AgentWallet, buildManifest } from '@actant/sdk'
import {
  CHAIN,
  REGISTRY_ADDRESS,
  FACTORY_ADDRESS,
  CHAIN_ID,
  CHAIN_NAME,
  RPC_URL,
  EXPLORER,
} from '@/app/lib/chain'
import { fetchAgentsByOperator, type AgentData } from '@/app/lib/contracts'
import { shortAddress } from '@/app/lib/format'

// ── helpers ─────────────────────────────────────────────────────────────────

type DepositStatus = 'idle' | 'loading' | 'done' | 'error'
type RegStep = '' | 'Computing wallet address…' | 'Sending deploy transaction…' | 'Waiting for confirmation…' | 'Agent registered ✓'

// ── skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-xl border border-[#ff7c6f12] p-4 space-y-2">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-3 w-48" />
          <div className="skeleton h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

// ── agent row ────────────────────────────────────────────────────────────────

const STATUS_LABEL = ['Active', 'Paused', 'Revoked'] as const
const STATUS_CLASS  = ['status-active', 'status-paused', 'status-revoked'] as const

interface AgentRowProps {
  agent:        AgentData
  depositState: DepositStatus
  depositMsg:   string
  onDeposit:    () => void
}

function AgentRow({ agent, depositState, depositMsg, onDeposit }: AgentRowProps) {
  const [expanded, setExpanded] = useState(false)
  const usdcNum = parseFloat(agent.balance)
  const lowUsdc = usdcNum < 0.04

  return (
    <div className="rounded-xl border border-[#ff7c6f18] bg-[rgba(30,16,20,0.5)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ff7c6f33] bg-[#ff7c6f0d]">
            <span className="font-mono text-[13px] font-semibold text-[#ff9f95]">A</span>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-sm text-[#ff9f95] truncate">{shortAddress(agent.wallet)}</p>
            <p className="font-mono text-[12px] text-white/30 truncate">id: {shortAddress(agent.agentId)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-full px-2.5 py-1 font-mono text-[12px] uppercase tracking-[0.14em] ${STATUS_CLASS[agent.status]}`}>
            {STATUS_LABEL[agent.status]}
          </span>
          <button onClick={() => setExpanded(!expanded)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/40 hover:text-white transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d={expanded ? 'M2 8l4-4 4 4' : 'M2 4l4 4 4-4'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-[#ff7c6f12]">
        <div className="p-3">
          <p className="eyebrow text-white/25">USDC</p>
          <p className="mt-1 text-base font-semibold tracking-[-0.04em] text-[#f8eeec]">${usdcNum.toFixed(2)}</p>
          {lowUsdc && (
            <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
              className="mt-1 inline-block font-mono text-[12px] text-[#ffb16a] hover:text-[#ffc88a] transition-colors">
              Fund USDC ↗
            </a>
          )}
        </div>
        <div className="border-l border-[#ff7c6f12] p-3">
          <p className="eyebrow text-white/25">Daily limit</p>
          <p className="mt-1 text-base font-semibold tracking-[-0.04em] text-[#f8eeec]">
            ${parseFloat(agent.dailyLimit || '0').toFixed(2)}
          </p>
          <p className="font-mono text-[12px] text-white/25">per-tx: ${parseFloat(agent.perTxLimit || '0').toFixed(2)}</p>
        </div>
      </div>

      <AnimatePresence>
        {depositState !== 'done' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-[#ffb16a18]">
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#ffb16a06]">
              <div>
                <p className="font-mono text-[12px] text-[#ffb16a]">Fund ETH for gas</p>
                {depositMsg && (
                  <p className={`font-mono text-[12px] mt-0.5 ${depositState === 'error' ? 'text-[var(--danger,#ff7f7f)]' : 'text-[#7ad8b8]'}`}>
                    {depositMsg}
                  </p>
                )}
              </div>
              <button onClick={onDeposit} disabled={depositState === 'loading'}
                className="rounded-full border border-[#ffb16a33] bg-[#ffb16a0d] px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-[#ffb16a] hover:border-[#ffb16a55] disabled:opacity-50 transition-colors">
                {depositState === 'loading' ? '…' : 'Deposit 0.005 ETH'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-[#ff7c6f12]">
            <div className="space-y-3 p-4">
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                {[
                  { label: 'Wallet',   value: agent.wallet,   link: true },
                  { label: 'Agent ID', value: agent.agentId,  link: false },
                  { label: 'Operator', value: agent.operator, link: true },
                ].map(({ label, value, link }) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-white/25 shrink-0">{label}</p>
                    {link ? (
                      <a href={`${EXPLORER}/address/${value}`} target="_blank" rel="noopener noreferrer"
                        className="truncate font-mono text-[12px] text-white/50 hover:text-[#ff9f95] transition-colors">
                        {value.slice(0, 10)}…{value.slice(-8)}
                      </a>
                    ) : (
                      <p className="truncate font-mono text-[12px] text-white/40">
                        {value.slice(0, 10)}…{value.slice(-8)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-[#9db3ff18] bg-[#9db3ff06] p-3">
                <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#9db3ff]/50 mb-1">Manifest Hash</p>
                <p className="break-all font-mono text-[12px] text-[#9db3ff]/60">{agent.manifestHash}</p>
              </div>
              <a href={`${EXPLORER}/address/${agent.wallet}`} target="_blank" rel="noopener noreferrer"
                className="inline-block rounded-full border border-white/[0.08] px-4 py-2 font-mono text-[12px] uppercase tracking-[0.12em] text-white/40 hover:text-white transition-colors">
                Basescan ↗
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── main panel (inside PrivyProvider) ────────────────────────────────────────

function ControlPanelInner() {
  const { authenticated, ready, login } = usePrivy()
  const { wallets } = useWallets()

  const wallet  = wallets[0]
  const address = wallet?.address as `0x${string}` | undefined

  const [ethBalance,    setEthBalance]    = useState('')
  const [agents,        setAgents]        = useState<AgentData[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [depositStates, setDepositStates] = useState<Map<string, DepositStatus>>(new Map())
  const [depositMsgs,   setDepositMsgs]   = useState<Map<string, string>>(new Map())
  const [registerOpen,  setRegisterOpen]  = useState(false)
  const [agentName,     setAgentName]     = useState('')
  const [dailyLimit,    setDailyLimit]    = useState('50.00')
  const [perTxLimit,    setPerTxLimit]    = useState('5.00')
  const [recipients,    setRecipients]    = useState('')
  const [regStep,       setRegStep]       = useState<RegStep>('')
  const [regError,      setRegError]      = useState('')
  const [regSuccess,    setRegSuccess]    = useState<{ wallet: string; txHash: string } | null>(null)
  const [regLoading,    setRegLoading]    = useState(false)

  const loadAgents = useCallback(async (addr: `0x${string}`) => {
    setAgentsLoading(true)
    try { setAgents(await fetchAgentsByOperator(addr)) }
    catch (err) { console.error('loadAgents:', err) }
    finally { setAgentsLoading(false) }
  }, [])

  const loadEthBalance = useCallback(async (addr: `0x${string}`) => {
    try {
      const pc = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) })
      const raw = await pc.getBalance({ address: addr })
      setEthBalance(parseFloat(formatEther(raw)).toFixed(5))
    } catch { setEthBalance('...') }
  }, [])

  useEffect(() => {
    if (authenticated && address) {
      loadAgents(address)
      loadEthBalance(address)
    }
  }, [authenticated, address, loadAgents, loadEthBalance])

  const getViemWalletClient = useCallback(async () => {
    if (!wallet || !address) throw new Error('No wallet connected')
    await wallet.switchChain(CHAIN_ID)
    const provider = await wallet.getEthereumProvider()
    return createWalletClient({ account: address, chain: CHAIN, transport: custom(provider) })
  }, [wallet, address])

  async function handleDeposit(agent: AgentData) {
    if (!address) return
    const id = agent.agentId
    setDepositStates(prev => new Map(prev).set(id, 'loading'))
    setDepositMsgs(prev => new Map(prev).set(id, ''))
    try {
      const wc = await getViemWalletClient()
      const manifest = buildManifest({
        agentId: agent.agentId, name: agent.agentId.slice(0, 16),
        description: 'Loaded from dashboard', operator: agent.operator,
        wallet: agent.wallet, chainId: CHAIN_ID,
        config: { name: 'agent', spendingLimit: { daily: agent.dailyLimit, perTx: agent.perTxLimit } },
      })
      const w = AgentWallet.fromAddress(agent.wallet, agent.agentId, manifest, {
        account: wc.account as Account, externalWalletClient: wc,
        chainId: CHAIN_ID, rpcUrl: RPC_URL,
        factory: FACTORY_ADDRESS as `0x${string}`, registry: REGISTRY_ADDRESS as `0x${string}`,
      })
      await w.depositGas('0.005')
      setDepositStates(prev => new Map(prev).set(id, 'done'))
      setDepositMsgs(prev => new Map(prev).set(id, 'Deposited 0.005 ETH'))
      await loadEthBalance(address)
    } catch (err) {
      setDepositStates(prev => new Map(prev).set(id, 'error'))
      setDepositMsgs(prev => new Map(prev).set(id, String(err).slice(0, 120)))
    }
  }

  async function handleRegister() {
    if (!address) return
    setRegError('')
    setRegSuccess(null)
    setRegLoading(true)
    const rawRecipients = recipients.split(',').map(s => s.trim()).filter(Boolean)
    const bad = rawRecipients.find(r => !r.startsWith('0x'))
    if (bad) { setRegError(`Invalid address: ${bad}`); setRegLoading(false); return }
    try {
      setRegStep('Computing wallet address…')
      await new Promise(r => setTimeout(r, 0))
      setRegStep('Sending deploy transaction…')
      const wc = await getViemWalletClient()
      const { wallet: aw, response } = await AgentWallet.create(
        { name: agentName || 'unnamed-agent', spendingLimit: { daily: dailyLimit, perTx: perTxLimit }, allowedRecipients: rawRecipients as `0x${string}`[] },
        { account: wc.account as Account, externalWalletClient: wc, chainId: CHAIN_ID, rpcUrl: RPC_URL, factory: FACTORY_ADDRESS as `0x${string}`, registry: REGISTRY_ADDRESS as `0x${string}` },
      )
      setRegStep('Waiting for confirmation…')
      setRegStep('Agent registered ✓')
      setRegSuccess({ wallet: aw.walletAddress, txHash: (response as { txHash?: string })?.txHash ?? '' })
      setAgentName(''); setDailyLimit('50.00'); setPerTxLimit('5.00'); setRecipients('')
      await loadAgents(address)
    } catch (err) {
      setRegError(String(err).slice(0, 200))
      setRegStep('')
    } finally { setRegLoading(false) }
  }

  // ── not ready yet ──────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="card p-8 flex items-center justify-center gap-3">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-spin text-white/30">
          <path d="M15 8A7 7 0 111 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="font-mono text-[13px] text-white/30">Initializing…</p>
      </div>
    )
  }

  // ── wallet not connected ───────────────────────────────────────────────────
  if (!authenticated || !address) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="card p-10 text-center"
      >
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full border border-[#ff7c6f33] bg-[#ff7c6f0d] mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M21 12V7H5a2 2 0 010-4h14v4" stroke="#ff9f95" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 5v14a2 2 0 002 2h16v-5" stroke="#ff9f95" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 12a2 2 0 000 4h4v-4h-4z" stroke="#ff9f95" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-lg font-semibold tracking-[-0.03em] text-white mb-2">Wallet not connected</p>
        <p className="font-mono text-sm text-white/40 mb-6 leading-relaxed max-w-xs mx-auto">
          Use the <span className="text-[#ff9f95]">Connect Wallet</span> button in the top bar to get started.
        </p>
        <button
          onClick={login}
          className="rounded-full bg-[#ff9f95] px-6 py-2.5 font-mono text-[13px] uppercase tracking-[0.12em] text-[#1a0f11] hover:opacity-90 transition-opacity"
        >
          Connect Wallet
        </button>
      </motion.div>
    )
  }

  // ── connected: show management UI ─────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-[#ff7c6f12] px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#7ad8b833] bg-[#7ad8b80d]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="3" fill="#7ad8b8" />
              <circle cx="6" cy="6" r="5.5" stroke="#7ad8b8" strokeOpacity="0.3" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="eyebrow text-white/30">Operator</p>
            <p className="mt-0.5 font-mono text-[13px] text-[#ff9f95] truncate">{shortAddress(address)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-right">
          <div>
            <p className="font-mono text-[12px] text-white/25">ETH Balance</p>
            <p className="font-mono text-[13px] text-white/60">
              {ethBalance ? `${ethBalance} ETH` : 'N/A'}
            </p>
          </div>
          <div className="ml-2 h-8 w-px bg-[#ff7c6f12]" />
            <p className="font-mono text-[12px] text-white/25 whitespace-nowrap">
            {CHAIN_NAME}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-6">

        {/* Agents */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow text-white/30">Your Agents</p>
            <button onClick={() => address && loadAgents(address)} disabled={agentsLoading}
              className="font-mono text-[12px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-40">
              {agentsLoading ? '…' : '↻ Refresh'}
            </button>
          </div>

          {agentsLoading ? <Skeleton /> : agents.length === 0 ? (
            <div className="rounded-xl border border-[#ff7c6f12] bg-[rgba(30,16,20,0.3)] px-4 py-6 text-center">
              <p className="font-mono text-[13px] text-white/30">No agents yet. Register your first one below.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <AgentRow key={agent.agentId} agent={agent}
                  depositState={depositStates.get(agent.agentId) ?? 'idle'}
                  depositMsg={depositMsgs.get(agent.agentId) ?? ''}
                  onDeposit={() => handleDeposit(agent)} />
              ))}
            </div>
          )}
        </section>

        {/* Register */}
        <section>
          <button onClick={() => setRegisterOpen(!registerOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-[#ff7c6f18] bg-[rgba(30,16,20,0.4)] px-4 py-3 transition-colors hover:border-[#ff7c6f33]">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#ff9f9544] bg-[#ff9f950d] font-mono text-[13px] text-[#ff9f95]">
                {registerOpen ? '−' : '+'}
              </span>
              <p className="font-mono text-[13px] uppercase tracking-[0.12em] text-white/50">Register New Agent</p>
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={`text-white/30 transition-transform duration-200 ${registerOpen ? 'rotate-180' : ''}`}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <AnimatePresence>
            {registerOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                <div className="mt-3 rounded-xl border border-[#ff7c6f18] bg-[rgba(30,16,20,0.4)] p-4 space-y-4">

                  <AnimatePresence>
                    {regSuccess && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="rounded-xl border border-[#7ad8b833] bg-[#7ad8b806] p-4 space-y-2">
                          <p className="font-mono text-[13px] uppercase tracking-[0.12em] text-[#7ad8b8]">Agent registered ✓</p>
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-mono text-[12px] text-white/30">Wallet</p>
                            <a href={`${EXPLORER}/address/${regSuccess.wallet}`} target="_blank" rel="noopener noreferrer"
                              className="font-mono text-[13px] text-[#ff9f95] hover:text-[#ffb8b0] transition-colors">
                              {regSuccess.wallet.slice(0, 10)}…{regSuccess.wallet.slice(-8)} ↗
                            </a>
                          </div>
                          {regSuccess.txHash && (
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-mono text-[12px] text-white/30">Tx</p>
                              <a href={`${EXPLORER}/tx/${regSuccess.txHash}`} target="_blank" rel="noopener noreferrer"
                                className="font-mono text-[13px] text-white/50 hover:text-[#ff9f95] transition-colors">
                                {regSuccess.txHash.slice(0, 18)}… ↗
                              </a>
                            </div>
                          )}
                          <button onClick={() => setRegSuccess(null)} className="mt-1 font-mono text-[12px] text-white/30 hover:text-white transition-colors">
                            Register another →
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!regSuccess && (
                    <>
                      <div>
                        <label className="mb-1.5 block font-mono text-[12px] uppercase tracking-[0.14em] text-white/30">Agent Name</label>
                        <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)}
                          placeholder="my-trading-bot" disabled={regLoading}
                          className="w-full rounded-lg border border-[#ff7c6f18] bg-black/20 px-3 py-2.5 font-mono text-sm text-white placeholder-white/20 outline-none focus:border-[#ff7c6f44] transition-colors disabled:opacity-50" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block font-mono text-[12px] uppercase tracking-[0.14em] text-white/30">Daily USDC Limit</label>
                          <input type="number" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} disabled={regLoading}
                            className="w-full rounded-lg border border-[#ff7c6f18] bg-black/20 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-[#ff7c6f44] transition-colors disabled:opacity-50" />
                        </div>
                        <div>
                          <label className="mb-1.5 block font-mono text-[12px] uppercase tracking-[0.14em] text-white/30">Per-tx USDC Limit</label>
                          <input type="number" value={perTxLimit} onChange={e => setPerTxLimit(e.target.value)} disabled={regLoading}
                            className="w-full rounded-lg border border-[#ff7c6f18] bg-black/20 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-[#ff7c6f44] transition-colors disabled:opacity-50" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block font-mono text-[12px] uppercase tracking-[0.14em] text-white/30">
                          Allowed Recipients <span className="text-white/20">(optional, comma-separated)</span>
                        </label>
                        <textarea value={recipients} onChange={e => setRecipients(e.target.value)}
                          placeholder="0xabc…, 0xdef…" rows={2} disabled={regLoading}
                          className="w-full rounded-lg border border-[#ff7c6f18] bg-black/20 px-3 py-2.5 font-mono text-sm text-white placeholder-white/20 outline-none focus:border-[#ff7c6f44] resize-none transition-colors disabled:opacity-50" />
                      </div>

                      <AnimatePresence>
                        {regStep && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="flex items-center gap-2 rounded-lg border border-[#ff9f9522] bg-[#ff9f950a] px-3 py-2">
                              {regLoading && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 animate-spin text-[#ff9f95]"><path d="M11 6A5 5 0 111 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
                              <p className="font-mono text-[13px] text-[#ff9f95]">{regStep}</p>
                            </div>
                          </motion.div>
                        )}
                        {regError && (
                          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="font-mono text-[13px] text-[var(--danger,#ff7f7f)] leading-relaxed break-all">
                            {regError}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <button onClick={handleRegister} disabled={regLoading || !REGISTRY_ADDRESS || !FACTORY_ADDRESS}
                        className="w-full rounded-full bg-[#ff9f95] py-3 font-mono text-[13px] uppercase tracking-[0.12em] text-[#1a0f11] transition-opacity hover:opacity-90 disabled:opacity-40">
                        {regLoading ? regStep || 'Deploying…' : 'Deploy & Register'}
                      </button>

                      {(!REGISTRY_ADDRESS || !FACTORY_ADDRESS) && (
                        <p className="font-mono text-[12px] text-[#ffb16a] text-center">Registry/Factory not configured. Set env vars.</p>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </motion.div>
  )
}

// ── public export ─────────────────────────────────────────────────────────────

export default function ControlPanel() {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return (
      <div className="card p-8 text-center space-y-3">
        <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-[#ffb16a]">Privy not configured</p>
        <p className="font-mono text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
          Add <code className="text-white/60">NEXT_PUBLIC_PRIVY_APP_ID</code> to your <code className="text-white/60">.env</code> file.
          Get an App ID at{' '}
          <a href="https://dashboard.privy.io" target="_blank" rel="noopener noreferrer" className="text-[#ff9f95] hover:text-[#ffb8b0]">
            dashboard.privy.io ↗
          </a>
        </p>
      </div>
    )
  }
  return <ControlPanelInner />
}
