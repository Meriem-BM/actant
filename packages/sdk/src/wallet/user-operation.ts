import type { Account, createPublicClient } from 'viem'
import type { UserOperation } from '@atactant/shared'
import {
  ENTRY_POINT,
  ENTRY_POINT_ABI,
  estimateUserOpGas,
  getUserOpHash,
  sendUserOperation,
  signUserOp,
  waitForUserOpReceipt,
} from '../bundler'
import {
  DEFAULT_MAX_FEE_PER_GAS,
  DEFAULT_MAX_PRIORITY_FEE_PER_GAS,
} from './constants'
import { applyGasBuffer } from './helpers'
import type {
  Address,
  Hex,
  TxHash,
  UserOpGasFields,
  WalletClientLike,
} from './types'

type SendViaUserOperationParams = {
  bundlerUrl: string
  publicClient: ReturnType<typeof createPublicClient>
  walletAddress: Address
  account: Account
  walletClient: WalletClientLike
  chainId: number
  callData: Hex
}

type BuildUnsignedUserOperationParams = {
  publicClient: ReturnType<typeof createPublicClient>
  walletAddress: Address
  callData: Hex
}

export async function sendViaUserOperation(
  params: SendViaUserOperationParams,
): Promise<TxHash> {
  const partial = await buildUnsignedUserOperation({
    publicClient: params.publicClient,
    walletAddress: params.walletAddress,
    callData: params.callData,
  })
  const estimatedGas = await estimateUserOpGas(params.bundlerUrl, partial)
  const finalOp: UserOperation = {
    ...partial,
    ...bufferUserOpGas(estimatedGas),
  }
  finalOp.signature = await signWalletUserOperation({
    userOp: finalOp,
    account: params.account,
    walletClient: params.walletClient,
    chainId: params.chainId,
  })

  const userOpHash = await sendUserOperation(params.bundlerUrl, finalOp)
  const receipt = await waitForUserOpReceipt(params.bundlerUrl, userOpHash)

  return receipt.receipt.transactionHash
}

async function buildUnsignedUserOperation(
  params: BuildUnsignedUserOperationParams,
): Promise<UserOperation> {
  const nonce = (await params.publicClient.readContract({
    address: ENTRY_POINT,
    abi: ENTRY_POINT_ABI,
    functionName: 'getNonce',
    args: [params.walletAddress, 0n],
  })) as bigint

  const feeData = await params.publicClient.estimateFeesPerGas()

  return {
    sender: params.walletAddress,
    nonce,
    initCode: '0x',
    callData: params.callData,
    callGasLimit: 200_000n,
    verificationGasLimit: 200_000n,
    preVerificationGas: 50_000n,
    maxFeePerGas: feeData.maxFeePerGas ?? DEFAULT_MAX_FEE_PER_GAS,
    maxPriorityFeePerGas:
      feeData.maxPriorityFeePerGas ?? DEFAULT_MAX_PRIORITY_FEE_PER_GAS,
    paymasterAndData: '0x',
    signature: '0x',
  }
}

function bufferUserOpGas(gas: UserOpGasFields): UserOpGasFields {
  return {
    callGasLimit: applyGasBuffer(gas.callGasLimit),
    verificationGasLimit: applyGasBuffer(gas.verificationGasLimit),
    preVerificationGas: applyGasBuffer(gas.preVerificationGas),
  }
}

async function signWalletUserOperation(params: {
  userOp: UserOperation
  account: Account
  walletClient: WalletClientLike
  chainId: number
}): Promise<Hex> {
  if (params.account.signMessage) {
    return signUserOp(params.userOp, params.account, params.chainId)
  }

  if (params.walletClient.signMessage) {
    const hash = getUserOpHash(params.userOp, params.chainId)
    return params.walletClient.signMessage({
      account: params.account.address,
      message: { raw: hash },
    })
  }

  throw new Error('Connected wallet client cannot sign UserOperations')
}
