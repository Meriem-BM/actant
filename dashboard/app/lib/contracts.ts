'use client'

import { formatUnits } from 'viem'
import { getPublicClient, REGISTRY_ADDRESS, USDC_ADDRESS } from './chain'
import { AGENT_REGISTRY_ABI, AGENT_WALLET_ABI, ERC20_ABI } from '@actant/sdk'

export interface AgentData {
  agentId:         `0x${string}`  // internal policy registry key (bytes32)
  tokenId:         bigint          // ERC-8004 Identity Registry NFT tokenId (uint256)
  wallet:          `0x${string}`
  operator:        `0x${string}`
  manifestHash:    `0x${string}`
  registeredAt:    Date
  lastActiveAt:    Date
  executionCount:  number
  totalSettled:    string   // human-readable USDC
  reputationScore: number   // 0–100
  status:          0 | 1 | 2  // 0=Active, 1=Paused, 2=Revoked
  balance:         string   // human-readable USDC
  dailySpent:      string   // human-readable USDC
  dailyLimit:      string   // human-readable USDC
  perTxLimit:      string   // human-readable USDC
}

export interface ExecutionEvent {
  agentId:        `0x${string}`
  logHash:        `0x${string}`
  amountSettled:  string
  success:        boolean
  blockNumber:    bigint
  txHash:         `0x${string}`
  timestamp?:     Date
}

const USDC_DEC = 6

function fmt(raw: bigint) {
  return formatUnits(raw, USDC_DEC)
}

export async function fetchAgentsByOperator(
  operator: `0x${string}`,
): Promise<AgentData[]> {
  if (!REGISTRY_ADDRESS) return []

  const client = getPublicClient()

  // Get all agentIds for this operator
  const agentIds = await client.readContract({
    address:      REGISTRY_ADDRESS,
    abi:          AGENT_REGISTRY_ABI,
    functionName: 'getAgentsByOperator',
    args:         [operator],
  }) as `0x${string}`[]

  if (!agentIds.length) return []

  // Fetch each agent's full record + wallet data in parallel
  const records = await Promise.all(
    agentIds.map(async (agentId) => {
      const rec = await client.readContract({
        address:      REGISTRY_ADDRESS,
        abi:          AGENT_REGISTRY_ABI,
        functionName: 'getAgent',
        args:         [agentId],
      }) as {
        wallet:          `0x${string}`
        operator:        `0x${string}`
        manifestHash:    `0x${string}`
        registeredAt:    bigint
        lastActiveAt:    bigint
        executionCount:  number
        totalSettled:    bigint
        reputationScore: number
        status:          number
      }

      // Fetch wallet-specific data (balance + spend)
      const [balance, dailySpent, dailyLimit, perTxLimit] = await Promise.all([
        client.readContract({
          address:      USDC_ADDRESS,
          abi:          ERC20_ABI,
          functionName: 'balanceOf',
          args:         [rec.wallet],
        }) as Promise<bigint>,
        client.readContract({
          address:      rec.wallet,
          abi:          AGENT_WALLET_ABI,
          functionName: 'dailySpent',
        }).catch(() => 0n) as Promise<bigint>,
        client.readContract({
          address:      rec.wallet,
          abi:          AGENT_WALLET_ABI,
          functionName: 'dailyLimit',
        }).catch(() => 0n) as Promise<bigint>,
        client.readContract({
          address:      rec.wallet,
          abi:          AGENT_WALLET_ABI,
          functionName: 'perTxLimit',
        }).catch(() => 0n) as Promise<bigint>,
      ])

      return {
        agentId,
        tokenId:         0n, // TODO: read from ERC-8004 Identity Registry after Option B refactor
        wallet:          rec.wallet,
        operator:        rec.operator,
        manifestHash:    rec.manifestHash,
        registeredAt:    new Date(Number(rec.registeredAt) * 1000),
        lastActiveAt:    new Date(Number(rec.lastActiveAt) * 1000),
        executionCount:  Number(rec.executionCount),
        totalSettled:    fmt(rec.totalSettled),
        reputationScore: Math.round(Number(rec.reputationScore) / 100),
        status:          rec.status as 0 | 1 | 2,
        balance:         fmt(balance),
        dailySpent:      fmt(dailySpent),
        dailyLimit:      fmt(dailyLimit),
        perTxLimit:      fmt(perTxLimit),
      } satisfies AgentData
    })
  )

  return records
}

export async function fetchRecentExecutions(
  fromBlock?: bigint,
): Promise<ExecutionEvent[]> {
  if (!REGISTRY_ADDRESS) return []

  const client = getPublicClient()

  const latest = await client.getBlockNumber()
  const from   = fromBlock ?? (latest > 500n ? latest - 500n : 0n)

  const logs = await client.getLogs({
    address:   REGISTRY_ADDRESS,
    event:     {
      name:    'ExecutionLogged',
      type:    'event',
      inputs:  [
        { name: 'agentId',       type: 'bytes32', indexed: true  },
        { name: 'logHash',       type: 'bytes32', indexed: true  },
        { name: 'amountSettled', type: 'uint256', indexed: false },
        { name: 'success',       type: 'bool',    indexed: false },
      ],
    },
    fromBlock: from,
    toBlock:   latest,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return logs.reverse().slice(0, 50).map((log: any) => ({
    agentId:       log.args.agentId as `0x${string}`,
    logHash:       log.args.logHash as `0x${string}`,
    amountSettled: fmt(log.args.amountSettled as bigint),
    success:       log.args.success as boolean,
    blockNumber:   log.blockNumber!,
    txHash:        log.transactionHash!,
  }))
}

