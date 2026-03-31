'use client'

import { useCallback } from 'react'
import Header from '@/components/Header'
import StatsBar from '@/components/StatsBar'
import ExecutionFeed from '@/components/ExecutionFeed'
import AgentRunner from '@/components/AgentRunner'
import WalletSync from '@/components/WalletSync'
import ControlPanelCta from '@/components/dashboard/ControlPanelCta'
import AgentSection from '@/components/dashboard/AgentSection'
import DashboardFooter from '@/components/dashboard/DashboardFooter'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useOperatorAddress } from '@/hooks/useOperatorAddress'

export default function DashboardPageClient() {
  const { operatorAddress, setOperatorAddress } = useOperatorAddress()
  const {
    agents,
    executions,
    loading,
    isLive,
    lastUpdated,
    hasValidOperator,
    refresh,
    handleNewExecution,
  } = useDashboardData(operatorAddress)

  const visibleAgents = hasValidOperator ? agents : []
  const visibleExecutions = hasValidOperator ? executions : []

  const handleOperatorDetected = useCallback(
    (operator: string) => {
      setOperatorAddress(operator)
    },
    [setOperatorAddress],
  )

  return (
    <div className="min-h-screen">
      <WalletSync onAddress={setOperatorAddress} />

      <Header
        operatorAddress={operatorAddress}
        onAddressChange={setOperatorAddress}
        isLive={isLive}
        lastUpdated={lastUpdated}
      />

      <main className="mx-auto max-w-[88rem] px-5 py-8 sm:px-6 md:px-8">
        <div className="mb-6">
          <ControlPanelCta />
        </div>

        <StatsBar agents={visibleAgents} loading={loading} />

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <AgentSection
              operatorAddress={operatorAddress}
              hasValidOperator={hasValidOperator}
              agents={visibleAgents}
              loading={loading}
              onRefresh={refresh}
            />
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <ExecutionFeed
              events={visibleExecutions}
              agents={visibleAgents}
              loading={loading && visibleExecutions.length === 0}
            />
          </div>
        </div>

        <div className="mt-6">
          <AgentRunner
            onNewExecution={handleNewExecution}
            onOperatorDetected={handleOperatorDetected}
          />
        </div>

        <DashboardFooter />
      </main>
    </div>
  )
}
