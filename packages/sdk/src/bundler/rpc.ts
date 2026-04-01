import { toHex } from 'viem'
import type { UserOperation } from '@actant/shared'
import type { JsonRpcResponse } from './types'

export function serializeUserOperation(
  userOp: UserOperation,
): Record<string, string> {
  return {
    sender: userOp.sender,
    nonce: toHex(userOp.nonce),
    initCode: userOp.initCode,
    callData: userOp.callData,
    callGasLimit: toHex(userOp.callGasLimit),
    verificationGasLimit: toHex(userOp.verificationGasLimit),
    preVerificationGas: toHex(userOp.preVerificationGas),
    maxFeePerGas: toHex(userOp.maxFeePerGas),
    maxPriorityFeePerGas: toHex(userOp.maxPriorityFeePerGas),
    paymasterAndData: userOp.paymasterAndData,
    signature: userOp.signature,
  }
}

export async function rpc<T>(
  url: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })

  if (!response.ok) {
    throw new Error(
      `Bundler [${method}] HTTP ${response.status} ${response.statusText}`,
    )
  }

  const json = (await response.json()) as JsonRpcResponse<T>
  if (json.error) {
    throw new Error(
      `Bundler [${method}] ${json.error.message} (code ${json.error.code})`,
    )
  }

  if (json.result === undefined) {
    throw new Error(`Bundler [${method}] returned no result`)
  }

  return json.result
}
