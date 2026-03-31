/**
 * Contract ABIs for Actant on-chain contracts.
 * Minimal — only the functions the SDK needs to call.
 */

export const AGENT_WALLET_ABI = [
  // Read
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'agentId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'dailyLimit',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'perTxLimit',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'dailySpent',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getNonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Write
  {
    name: 'pay',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to',     type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'memo',   type: 'string'  },
    ],
    outputs: [],
  },
  {
    name: 'execute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to',   type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data',  type: 'bytes'   },
    ],
    outputs: [],
  },
  {
    name: 'updateLimits',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_dailyLimit', type: 'uint256' },
      { name: '_perTxLimit', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'allowRecipient',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'recipient', type: 'address' }],
    outputs: [],
  },
  // Events
  {
    name: 'PaymentSent',
    type: 'event',
    inputs: [
      { name: 'to',      type: 'address', indexed: true  },
      { name: 'amount',  type: 'uint256', indexed: false },
      { name: 'memo',    type: 'string',  indexed: false },
      { name: 'logHash', type: 'bytes32', indexed: false },
    ],
  },
] as const

export const AGENT_REGISTRY_ABI = [
  // Read
  {
    name: 'getAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [{
      type: 'tuple',
      components: [
        { name: 'wallet',          type: 'address' },
        { name: 'operator',        type: 'address' },
        { name: 'manifestHash',    type: 'bytes32' },
        { name: 'registeredAt',    type: 'uint64'  },
        { name: 'lastActiveAt',    type: 'uint64'  },
        { name: 'executionCount',  type: 'uint32'  },
        { name: 'totalSettled',    type: 'uint128' },
        { name: 'reputationScore', type: 'uint16'  },
        { name: 'status',          type: 'uint8'   },
      ],
    }],
  },
  {
    name: 'isActive',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getAgentsByOperator',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'operator', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  // Write
  {
    name: 'registerAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId',      type: 'bytes32' },
      { name: 'wallet',       type: 'address' },
      { name: 'operator',     type: 'address' },
      { name: 'manifestHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'pauseAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'resumeAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'revokeAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'logExecution',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId',       type: 'bytes32' },
      { name: 'logHash',       type: 'bytes32' },
      { name: 'amountSettled', type: 'uint256' },
      { name: 'success',       type: 'bool'    },
    ],
    outputs: [],
  },
  // Events
  {
    name: 'AgentRegistered',
    type: 'event',
    inputs: [
      { name: 'agentId',      type: 'bytes32', indexed: true  },
      { name: 'wallet',       type: 'address', indexed: true  },
      { name: 'operator',     type: 'address', indexed: true  },
      { name: 'manifestHash', type: 'bytes32', indexed: false },
    ],
  },
  {
    name: 'ExecutionLogged',
    type: 'event',
    inputs: [
      { name: 'agentId',       type: 'bytes32', indexed: true  },
      { name: 'logHash',       type: 'bytes32', indexed: true  },
      { name: 'amountSettled', type: 'uint256', indexed: false },
      { name: 'success',       type: 'bool',    indexed: false },
    ],
  },
] as const

export const AGENT_WALLET_FACTORY_ABI = [
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
    name: 'wallets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
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

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to',     type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const
