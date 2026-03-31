'use client'

import { useState, useEffect, useCallback } from 'react'
import { isAddress } from 'viem'
import Header        from '@/components/Header'
import StatsBar      from '@/components/StatsBar'
import AgentCard     from '@/components/AgentCard'
import ExecutionFeed from '@/components/ExecutionFeed'
import EmptyState    from '@/components/EmptyState'
import AgentRunner   from '@/components/AgentRunner'
import {
  fetchAgentsByOperator,
  fetchRecentExecutions,
  type AgentData,
  type ExecutionEvent,
} from '@/app/lib/contracts'
import { REGISTRY_ADDRESS } from '@/app/lib/chain'

const POLL_INTERVAL = 15_000

export default function DashboardPage() {
  const [operatorAddress, setOperatorAddress] = useState('')
  const [agents,          setAgents]          = useState<AgentData[]>([])
  const [executions,      setExecutions]      = useState<ExecutionEvent[]>([])
  const [loading,         setLoading]         = useState(false)
  const [isLive,          setIsLive]          = useState(false)
  const [lastUpdated,     setLastUpdated]     = useState<Date>()

  const fetchData = useCallback(async (operator: string) => {
    if (!REGISTRY_ADDRESS || !isAddress(operator)) return

    setLoading(true)
    try {
      const [agentData, execData] = await Promise.all([
        fetchAgentsByOperator(operator as `0x${string}`),
        fetchRecentExecutions(),
      ])
      setAgents(agentData)
      setExecutions(execData)
      setIsLive(true)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setIsLive(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAddress(operatorAddress)) fetchData(operatorAddress)
  }, [operatorAddress, fetchData])

  useEffect(() => {
    if (!isAddress(operatorAddress)) return
    const id = setInterval(() => fetchData(operatorAddress), POLL_INTERVAL)
    return () => clearInterval(id)
  }, [operatorAddress, fetchData])

  const handleNewExecution = useCallback((event: ExecutionEvent) => {
    setExecutions(prev => [event, ...prev])
    setLastUpdated(new Date())
  }, [])

  const showAgents = isAddress(operatorAddress) ? agents : []
  const showExec   = isAddress(operatorAddress) ? executions : []
  const showEmpty  = !isAddress(operatorAddress) || (!loading && agents.length === 0)
  const showEmbeddedEmptyHeader = showEmpty && !REGISTRY_ADDRESS

  return (
    <div className="min-h-screen">
      <Header
        operatorAddress={operatorAddress}
        onAddressChange={setOperatorAddress}
        isLive={isLive}
        lastUpdated={lastUpdated}
      />

      <main className="mx-auto max-w-[88rem] px-5 py-8 sm:px-6 md:px-8">
        {/* Stats bar */}
        <StatsBar agents={showAgents} loading={loading} />

        {/* Main grid: agents (left) + execution feed (right) */}
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">

          {/* Left: Agent cards */}
          <div className="space-y-4">
            {!showEmbeddedEmptyHeader && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-white/30">Execution Accounts</p>
                  <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-white/80">
                    {showAgents.length > 0
                      ? `${showAgents.length} agent${showAgents.length !== 1 ? 's' : ''} registered`
                      : 'Agent Wallets'}
                  </p>
                </div>
                {isAddress(operatorAddress) && (
                  <button
                    onClick={() => fetchData(operatorAddress)}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 font-mono text-[13px] uppercase tracking-[0.1em] text-white/40 transition-colors hover:text-white disabled:opacity-50"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={loading ? 'animate-spin' : ''}>
                      <path d="M9 5A4 4 0 111 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Refresh
                  </button>
                )}
              </div>
            )}

            {showEmpty ? (
              <EmptyState
                hasAddress={isAddress(operatorAddress)}
                panelTitle={showEmbeddedEmptyHeader ? 'Execution Accounts' : undefined}
                panelSubtitle={showEmbeddedEmptyHeader ? 'Registry setup required' : undefined}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {showAgents.map((agent, i) => (
                  <AgentCard
                    key={agent.agentId}
                    agent={agent}
                    index={i}
                    onRefresh={() => fetchData(operatorAddress)}
                  />
                ))}
                {loading && agents.length === 0 && (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="card p-5 space-y-4">
                      <div className="skeleton h-8 w-40" />
                      <div className="skeleton h-6 w-24" />
                      <div className="skeleton h-3 w-full" />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right: Execution feed */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ExecutionFeed
              events={showExec}
              agents={showAgents}
              loading={loading && showExec.length === 0}
            />
          </div>
        </div>

        {/* Agent runner — full width below the grid */}
        <div className="mt-6">
          <AgentRunner onNewExecution={handleNewExecution} />
        </div>

        {/* Footer */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-[#ff7c6f18] pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[#ff7c6f44] bg-[#ff7c6f0d]">
              <span className="text-[12px] font-semibold text-[#ff9f95]">A</span>
            </div>
            <p className="font-mono text-[13px] text-white/25">Actant — Operator Dashboard</p>
          </div>
          <p className="font-mono text-[12px] text-white/15">
            ERC-4337 execution accounts · ERC-8004 agent identity · Base L2
          </p>
        </div>
      </main>
    </div>
  )
}
