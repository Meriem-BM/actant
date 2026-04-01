export const AGENT_WALLET_FACTORY_ABI = [
  {
    name: 'implementation',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'registry',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'usdc',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'wallets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getWalletAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'agentId', type: 'bytes32' },
      { name: 'owner',   type: 'address' },
    ],
    outputs: [{ name: 'predicted', type: 'address' }],
  },
  {
    name: 'createWallet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId',      type: 'bytes32' },
      { name: 'owner',        type: 'address' },
      { name: 'dailyLimit',   type: 'uint256' },
      { name: 'perTxLimit',   type: 'uint256' },
      { name: 'manifestHash', type: 'bytes32' },
    ],
    outputs: [{ name: 'wallet', type: 'address' }],
  },
  {
    name: 'WalletCreated',
    type: 'event',
    inputs: [
      { name: 'agentId',    type: 'bytes32', indexed: true  },
      { name: 'wallet',     type: 'address', indexed: true  },
      { name: 'operator',   type: 'address', indexed: true  },
      { name: 'dailyLimit', type: 'uint256', indexed: false },
      { name: 'perTxLimit', type: 'uint256', indexed: false },
    ],
  },
] as const

