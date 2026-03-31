/**
 * SSE endpoint for the autonomous research demo.
 *
 * The dashboard UI now runs this flow directly in the browser with the
 * connected Privy wallet. This route remains available for server-side
 * or headless runs that still provide an operator private key.
 */

import { type NextRequest } from 'next/server'
import { privateKeyToAccount } from 'viem/accounts'
import { runDemoAgent, type AgentEvent } from '@/app/lib/demoAgent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      const rawKey = process.env.AGENT_PRIVATE_KEY
      if (!rawKey) {
        send({ type: 'error', msg: 'AGENT_PRIVATE_KEY not set. See dashboard/.env.example' })
        controller.close()
        return
      }

      const privateKey = (rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`) as `0x${string}`

      try {
        await runDemoAgent(send, {
          account:    privateKeyToAccount(privateKey),
          chainId:    Number(process.env.CHAIN_ID ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532),
          rpcUrl:     process.env.BASE_SEPOLIA_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? 'https://sepolia.base.org',
          factory:    (process.env.FACTORY_ADDRESS ?? process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? '') as `0x${string}`,
          registry:   (process.env.REGISTRY_ADDRESS ?? process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? '') as `0x${string}`,
          bundlerUrl: process.env.BUNDLER_URL ?? process.env.NEXT_PUBLIC_BUNDLER_URL ?? undefined,
        })
      } catch (err) {
        send({ type: 'error', msg: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
