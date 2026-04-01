export interface GasEstimate {
  preVerificationGas: bigint
  verificationGasLimit: bigint
  callGasLimit: bigint
}

export interface UserOpReceipt {
  userOpHash: `0x${string}`
  sender: `0x${string}`
  success: boolean
  actualGasUsed: string
  receipt: {
    transactionHash: `0x${string}`
    blockNumber: string
    status: string
  }
}

export type JsonRpcError = {
  code: number
  message: string
}

export type JsonRpcResponse<T> = {
  result?: T
  error?: JsonRpcError
}
