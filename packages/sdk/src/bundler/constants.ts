export const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as `0x${string}`

export const ENTRY_POINT_ABI = [
  {
    name: 'getNonce',
    type: 'function',
    inputs: [
      { name: 'sender', type: 'address' },
      { name: 'key', type: 'uint192' },
    ],
    outputs: [{ name: 'nonce', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'depositTo',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

export const DUMMY_SIGNATURE = ('0x' +
  'ec'.repeat(32) +
  'ec'.repeat(32) +
  '1b') as `0x${string}`
