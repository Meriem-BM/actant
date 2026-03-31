import AgentCard from '@/components/AgentCard'
import EmptyState from '@/components/EmptyState'
import type { AgentData } from '@/app/lib/contracts'
import { REGISTRY_ADDRESS } from '@/app/lib/chain'

interface AgentSectionProps {
  operatorAddress: string
  hasValidOperator: boolean
  agents: AgentData[]
  loading: boolean
  onRefresh: () => void
}

export default function AgentSection({
  operatorAddress,
  hasValidOperator,
  agents,
  loading,
  onRefresh,
}: AgentSectionProps) {
  const showEmpty = !hasValidOperator || (!loading && agents.length === 0)
  const showEmbeddedEmptyHeader = showEmpty && !REGISTRY_ADDRESS

  if (showEmpty) {
    return (
      <EmptyState
        hasAddress={hasValidOperator}
        panelTitle={
          showEmbeddedEmptyHeader ? 'Execution Accounts' : undefined
        }
        panelSubtitle={
          showEmbeddedEmptyHeader ? 'Registry setup required' : undefined
        }
      />
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow text-white/30">Execution Accounts</p>
          <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-white/80">
            {agents.length} agent{agents.length !== 1 ? 's' : ''} registered
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading || !hasValidOperator || !operatorAddress}
          className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 font-mono text-[13px] uppercase tracking-[0.1em] text-white/40 transition-colors hover:text-white disabled:opacity-50"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className={loading ? 'animate-spin' : ''}
          >
            <path
              d="M9 5A4 4 0 111 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {agents.map((agent, index) => (
          <AgentCard
            key={agent.agentId}
            agent={agent}
            index={index}
            onRefresh={onRefresh}
          />
        ))}

        {loading && agents.length === 0 &&
          Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="card space-y-4 p-5">
              <div className="skeleton h-8 w-40" />
              <div className="skeleton h-6 w-24" />
              <div className="skeleton h-3 w-full" />
            </div>
          ))}
      </div>
    </>
  )
}
