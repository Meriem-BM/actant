import {
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  type Account,
} from 'viem'
import type { UserOperation } from '@actant/shared'
import { AGENT_WALLET_ABI } from '../abis'
import { ENTRY_POINT } from './constants'

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

export function getUserOpHash(
  userOp: UserOperation,
  chainId: number,
): `0x${string}` {
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
    abi: AGENT_WALLET_ABI,
    functionName: 'pay',
    args: [to, amount, memo],
  })
}
