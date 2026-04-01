import type { UserOperation } from '@atactant/shared'
import { DUMMY_SIGNATURE, ENTRY_POINT } from './constants'
import { rpc, serializeUserOperation } from './rpc'
import type { GasEstimate, UserOpReceipt } from './types'

export async function estimateUserOpGas(
  bundlerUrl: string,
  userOp: UserOperation,
): Promise<GasEstimate> {
  const forEstimation = { ...userOp, signature: DUMMY_SIGNATURE }
  const result = await rpc<{
    preVerificationGas: string
    verificationGasLimit: string
    callGasLimit: string
  }>(bundlerUrl, 'eth_estimateUserOperationGas', [
    serializeUserOperation(forEstimation),
    ENTRY_POINT,
  ])

  return {
    preVerificationGas: BigInt(result.preVerificationGas),
    verificationGasLimit: BigInt(result.verificationGasLimit),
    callGasLimit: BigInt(result.callGasLimit),
  }
}

export async function sendUserOperation(
  bundlerUrl: string,
  userOp: UserOperation,
): Promise<`0x${string}`> {
  return rpc<`0x${string}`>(bundlerUrl, 'eth_sendUserOperation', [
    serializeUserOperation(userOp),
    ENTRY_POINT,
  ])
}

export async function waitForUserOpReceipt(
  bundlerUrl: string,
  userOpHash: `0x${string}`,
  timeoutMs = 60_000,
  pollIntervalMs = 2_000,
): Promise<UserOpReceipt> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const receipt = await rpc<UserOpReceipt | null>(
      bundlerUrl,
      'eth_getUserOperationReceipt',
      [userOpHash],
    ).catch(() => null)

    if (receipt) {
      if (!receipt.success) {
        throw new Error(`UserOp reverted on-chain: ${userOpHash}`)
      }
      return receipt
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(`UserOp ${userOpHash} not mined within ${timeoutMs / 1000}s`)
}
