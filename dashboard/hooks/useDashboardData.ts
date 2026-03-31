'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isAddress } from 'viem'
import {
  fetchAgentsByOperator,
  fetchRecentExecutions,
  type AgentData,
  type ExecutionEvent,
} from '@/app/lib/contracts'
import { REGISTRY_ADDRESS } from '@/app/lib/chain'

const POLL_INTERVAL_MS = 15_000

type FetchOptions = {
  silent?: boolean
}

export function useDashboardData(operatorAddress: string) {
  const [agents, setAgents] = useState<AgentData[]>([])
  const [executions, setExecutions] = useState<ExecutionEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>()
  const requestCounterRef = useRef(0)

  const hasValidOperator = isAddress(operatorAddress)
  const canFetch = hasValidOperator && Boolean(REGISTRY_ADDRESS)

  const fetchData = useCallback(
    async ({ silent = false }: FetchOptions = {}) => {
      if (!canFetch) {
        return
      }

      const requestId = ++requestCounterRef.current

      if (!silent) {
        setLoading(true)
      }

      try {
        const [agentData, executionData] = await Promise.all([
          fetchAgentsByOperator(operatorAddress as `0x${string}`),
          fetchRecentExecutions(),
        ])

        if (requestId !== requestCounterRef.current) {
          return
        }

        setAgents(agentData)
        setExecutions(executionData)
        setIsLive(true)
        setLastUpdated(new Date())
      } catch (error) {
        if (requestId !== requestCounterRef.current) {
          return
        }

        console.error('Dashboard fetch error:', error)
        setIsLive(false)
      } finally {
        if (!silent && requestId === requestCounterRef.current) {
          setLoading(false)
        }
      }
    },
    [canFetch, operatorAddress],
  )

  const refresh = useCallback(() => fetchData(), [fetchData])

  useEffect(() => {
    if (!canFetch) {
      requestCounterRef.current += 1
      setAgents([])
      setExecutions([])
      setIsLive(false)
      setLoading(false)
      setLastUpdated(undefined)
      return
    }

    void fetchData()
  }, [canFetch, fetchData])

  useEffect(() => {
    if (!canFetch) {
      return
    }

    const intervalId = window.setInterval(() => {
      void fetchData({ silent: true })
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [canFetch, fetchData])

  const handleNewExecution = useCallback((event: ExecutionEvent) => {
    setExecutions((previous) => [event, ...previous])
    setLastUpdated(new Date())
  }, [])

  return {
    agents,
    executions,
    loading,
    isLive,
    lastUpdated,
    hasValidOperator,
    canFetch,
    refresh,
    handleNewExecution,
  }
}
