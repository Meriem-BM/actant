import {
  keccak256,
  encodeAbiParameters,
  encodeFunctionData,
  toHex,
  type Account,
} from 'viem'
import type { UserOperation } from '@agentpay/shared'
import { AGENT_WALLET_ABI } from './abis'

export const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as `0x${string}`

export const ENTRY_POINT_ABI = [
  {
    name:    'getNonce',
    type:    'function',
    inputs:  [{ name: 'sender', type: 'address' }, { name: 'key', type: 'uint192' }],
    outputs: [{ name: 'nonce', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name:    'depositTo',
    type:    'function',
    inputs:  [{ name: 'account', type: 'address' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    name:    'balanceOf',
    type:    'function',
    inputs:  [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

const DUMMY_SIGNATURE = ('0x' + 'ec'.repeat(32) + 'ec'.repeat(32) + '1b') as `0x${string}`

function packUserOp(userOp: UserOperation): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { name: 'sender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'initCodeHash', type: 'bytes32' },
        { name: 'callDataHash', type: 'bytes32' },
        { name: 'callGasLimit', type: 'uint256' },
        { name: 'verificationGasLimit', type: 'uint256' },
        { name: 'preVerificationGas', type: 'uint256' },
        { name: 'maxFeePerGas', type: 'uint256' },
        { name: 'maxPriorityFeePerGas', type: 'uint256' },
        { name: 'paymasterAndDataHash', type: 'bytes32' },
      ],
      [
        userOp.sender,
        userOp.nonce,
        keccak256(userOp.initCode),
        keccak256(userOp.callData),
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas,
        keccak256(userOp.paymasterAndData),
      ],
    ),
  )
}

export function getUserOpHash(userOp: UserOperation, chainId: number): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { name: 'packed', type: 'bytes32' },
        { name: 'entryPoint', type: 'address' },
        { name: 'chainId', type: 'uint256' },
      ],
      [packUserOp(userOp), ENTRY_POINT, BigInt(chainId)],
    ),
  )
}

export async function signUserOp(
  userOp: UserOperation,
  account: Account,
  chainId: number,
): Promise<`0x${string}`> {
  const hash = getUserOpHash(userOp, chainId)
  if (!account.signMessage) {
    throw new Error('signUserOp: account does not support signMessage')
  }
  return account.signMessage({ message: { raw: hash } })
}

export function encodePayCallData(
  to: `0x${string}`,
  amount: bigint,
  memo: string,
): `0x${string}` {
  return encodeFunctionData({
    abi:          AGENT_WALLET_ABI,
    functionName: 'pay',
    args:         [to, amount, memo],
  })
}

function serialize(userOp: UserOperation): Record<string, string> {
  return {
    sender:               userOp.sender,
    nonce:                toHex(userOp.nonce),
    initCode:             userOp.initCode,
    callData:             userOp.callData,
    callGasLimit:         toHex(userOp.callGasLimit),
    verificationGasLimit: toHex(userOp.verificationGasLimit),
    preVerificationGas:   toHex(userOp.preVerificationGas),
    maxFeePerGas:         toHex(userOp.maxFeePerGas),
    maxPriorityFeePerGas: toHex(userOp.maxPriorityFeePerGas),
    paymasterAndData:     userOp.paymasterAndData,
    signature:            userOp.signature,
  }
}

type JsonRpcError = {
  code: number
  message: string
}

type JsonRpcResponse<T> = {
  result?: T
  error?: JsonRpcError
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
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
    throw new Error(`Bundler [${method}] ${json.error.message} (code ${json.error.code})`)
  }

  if (json.result === undefined) {
    throw new Error(`Bundler [${method}] returned no result`)
  }

  return json.result
}

export interface GasEstimate {
  preVerificationGas: bigint
  verificationGasLimit: bigint
  callGasLimit: bigint
}

export async function estimateUserOpGas(
  bundlerUrl: string,
  userOp: UserOperation,
): Promise<GasEstimate> {
  const forEstimation = { ...userOp, signature: DUMMY_SIGNATURE }
  const result = await rpc<{
    preVerificationGas:   string
    verificationGasLimit: string
    callGasLimit:         string
  }>(
    bundlerUrl,
    'eth_estimateUserOperationGas',
    [serialize(forEstimation), ENTRY_POINT],
  )
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
    serialize(userOp),
    ENTRY_POINT,
  ])
}

export interface UserOpReceipt {
  userOpHash: `0x${string}`
  sender: `0x${string}`
  success: boolean
  actualGasUsed: string
  receipt: {
    transactionHash: `0x${string}`
    blockNumber:     string
    status:          string
  }
}

export async function waitForUserOpReceipt(
  bundlerUrl: string,
  userOpHash: `0x${string}`,
  timeoutMs = 60_000,
  pollIntervalMs = 2_000,
): Promise<UserOpReceipt> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const receipt = await rpc<UserOpReceipt | null>(bundlerUrl, 'eth_getUserOperationReceipt', [userOpHash]).catch(() => null)

    if (receipt) {
      if (!receipt.success) {
        throw new Error(`UserOp reverted on-chain: ${userOpHash}`)
      }
      return receipt
    }

    await new Promise(r => setTimeout(r, pollIntervalMs))
  }

  throw new Error(`UserOp ${userOpHash} not mined within ${timeoutMs / 1000}s`)
}
