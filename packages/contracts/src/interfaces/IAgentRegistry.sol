// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAgentRegistry
 * @notice ERC-8004 compatible on-chain agent identity and reputation registry.
 *
 *  ERC-8004 (draft) defines a standard for autonomous AI agent identity:
 *  - Each agent has a unique bytes32 id (keccak256 of name + operator + salt)
 *  - Agents link to an operator wallet (the human/entity responsible)
 *  - Agents declare capabilities via a manifest hash (points to off-chain agent.json)
 *  - Execution logs are committed on-chain for verifiability
 *  - Reputation scores accumulate from successful/failed executions
 *
 *  References:
 *  - ERC-8004: https://github.com/ethereum/ERCs/issues/8004
 *  - ERC-4337: https://eips.ethereum.org/EIPS/eip-4337
 */
interface IAgentRegistry {

    // ─── Status ──────────────────────────────────────────────────────────
    enum Status { Active, Paused, Revoked }

    // ─── Core data structure ─────────────────────────────────────────────
    struct AgentRecord {
        address wallet;          // ERC-4337 execution account address
        address operator;        // human/entity responsible for this agent
        bytes32 manifestHash;    // keccak256 of off-chain agent.json content
        uint64  registeredAt;    // unix timestamp
        uint64  lastActiveAt;    // unix timestamp of last execution log
        uint32  executionCount;  // total number of logged executions
        uint128 totalSettled;    // total USDC settled (6 decimals)
        uint16  reputationScore; // 0–10000 basis points (100.00%)
        Status  status;
    }

    // ─── Events ───────────────────────────────────────────────────────────
    event AgentRegistered(
        bytes32 indexed agentId,
        address indexed wallet,
        address indexed operator,
        bytes32 manifestHash
    );
    event AgentPaused(bytes32 indexed agentId, address indexed by);
    event AgentResumed(bytes32 indexed agentId, address indexed by);
    event AgentRevoked(bytes32 indexed agentId, address indexed by);
    event ManifestUpdated(bytes32 indexed agentId, bytes32 oldHash, bytes32 newHash);
    event ExecutionLogged(
        bytes32 indexed agentId,
        bytes32 indexed logHash,
        uint256 amountSettled,
        bool    success
    );
    event ReputationUpdated(bytes32 indexed agentId, uint16 oldScore, uint16 newScore);

    // ─── Registration ─────────────────────────────────────────────────────
    function registerAgent(
        bytes32 agentId,
        address wallet,
        address operator,
        bytes32 manifestHash
    ) external;

    // ─── Reads ────────────────────────────────────────────────────────────
    function getAgent(bytes32 agentId) external view returns (AgentRecord memory);
    function isActive(bytes32 agentId) external view returns (bool);
    function getWallet(bytes32 agentId) external view returns (address);
    function getOperator(bytes32 agentId) external view returns (address);

    // ─── Lifecycle ────────────────────────────────────────────────────────
    function pauseAgent(bytes32 agentId) external;
    function resumeAgent(bytes32 agentId) external;
    function revokeAgent(bytes32 agentId) external;
    function updateManifest(bytes32 agentId, bytes32 newManifestHash) external;

    // ─── Execution logging ────────────────────────────────────────────────
    function logExecution(
        bytes32 agentId,
        bytes32 logHash,       // keccak256 of the agent_log.json entry
        uint256 amountSettled, // USDC amount (6 decimals)
        bool    success
    ) external;
}
