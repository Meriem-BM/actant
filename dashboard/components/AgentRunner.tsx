'use client'

import AgentRunnerUnavailable from './agent-runner/AgentRunnerUnavailable'
import AgentRunnerView from './agent-runner/AgentRunnerView'
import { useAgentRunner } from './agent-runner/useAgentRunner'
import type { AgentRunnerProps } from './agent-runner/types'

export default function AgentRunner(props: AgentRunnerProps) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return <AgentRunnerUnavailable />
  }

  const viewModel = useAgentRunner(props)
  return <AgentRunnerView {...viewModel} />
}
