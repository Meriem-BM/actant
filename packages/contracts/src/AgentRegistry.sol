// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IAgentRegistry.sol";

/**
 * @title  AgentRegistry
 * @notice ERC-8004 on-chain identity and reputation registry for autonomous AI agents.
 *
 *  Serves as the authoritative source of truth for:
 *  1. Agent identity   — who controls the agent (operator) and what it can do (manifest)
 *  2. Execution logs   — cryptographic commitments to off-chain agent_log.json entries
 *  3. Reputation       — a running score derived from execution success rate
 *  4. Lifecycle        — pause / resume / revoke authority
 *
 *  ERC-4337 wallets call `logExecution()` after each settlement so operators
 *  and third parties can verify agent behaviour purely on-chain.
 */
contract AgentRegistry is IAgentRegistry {

    // ------------------------------------------------------------
    //                         Custom Errors
    // ------------------------------------------------------------

    error NotOwner();
    error NotOperator();
    error AgentNotFound();
    error AgentRevoked();
    error AgentIdTaken();
    error ZeroWallet();
    error ZeroOperator();
    error EmptyManifest();
    error ZeroFactory();
    error UnauthorizedCaller();
    error UnauthorizedLogger();
    error NotActive();
    error NotPaused();

    // ------------------------------------------------------------
    //                       State Variables
    // ------------------------------------------------------------

    /// @notice Deployer — the only address that can authorize trusted factories.
    address public immutable owner;

    /// @notice Contracts (factories) permitted to call registerAgent on behalf of an operator.
    mapping(address => bool) public trustedFactories;

    mapping(bytes32 => AgentRecord) private _agents;

    /// @dev Tracks agents registered per operator for enumeration.
    mapping(address => bytes32[]) private _operatorAgents;

    // ------------------------------------------------------------
    //                          Modifiers
    // ------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOperator(bytes32 agentId) {
        if (_agents[agentId].operator != msg.sender) revert NotOperator();
        _;
    }

    modifier agentExists(bytes32 agentId) {
        if (_agents[agentId].registeredAt == 0) revert AgentNotFound();
        _;
    }

    modifier agentNotRevoked(bytes32 agentId) {
        if (_agents[agentId].status == Status.Revoked) revert AgentRevoked();
        _;
    }

    // ------------------------------------------------------------
    //                         Constructor
    // ------------------------------------------------------------

    constructor() {
        owner = msg.sender;
    }

    // ------------------------------------------------------------
    //                     External Functions
    // ------------------------------------------------------------

    /**
     * @notice Authorize a factory contract to call registerAgent on behalf of operators.
     * @dev    Call this once per deployed AgentWalletFactory after it is deployed.
     */
    function addFactory(address factory) external onlyOwner {
        if (factory == address(0)) revert ZeroFactory();
        trustedFactories[factory] = true;
    }

    /**
     * @notice Register a new agent.
     *
     * @dev    Caller must be either:
     *         - The operator themselves (direct registration), or
     *         - A trusted factory (authorized via addFactory) acting on behalf of the operator.
     *         This prevents agentId squatting — an arbitrary EOA cannot register a
     *         bytes32 id and set someone else as operator.
     *
     * @param agentId      Unique ID — use keccak256(abi.encode(name, operator, salt))
     * @param wallet       ERC-4337 execution account address
     * @param operator     Address that controls and is responsible for this agent
     * @param manifestHash keccak256 of the off-chain agent.json capability manifest
     */
    function registerAgent(
        bytes32 agentId,
        address wallet,
        address operator,
        bytes32 manifestHash
    ) external override {
        if (msg.sender != operator && !trustedFactories[msg.sender]) revert UnauthorizedCaller();
        if (_agents[agentId].registeredAt != 0) revert AgentIdTaken();
        if (wallet       == address(0)) revert ZeroWallet();
        if (operator     == address(0)) revert ZeroOperator();
        if (manifestHash == bytes32(0)) revert EmptyManifest();

        _agents[agentId] = AgentRecord({
            wallet:          wallet,
            operator:        operator,
            manifestHash:    manifestHash,
            registeredAt:    uint64(block.timestamp),
            lastActiveAt:    uint64(block.timestamp),
            executionCount:  0,
            totalSettled:    0,
            reputationScore: 5000, // starts at 50.00% — neutral
            status:          Status.Active
        });

        _operatorAgents[operator].push(agentId);

        emit AgentRegistered(agentId, wallet, operator, manifestHash);
    }

    /**
     * @notice Commit an execution log entry on-chain.
     * @dev    Called by the AgentWallet after each successful (or failed) settlement.
     *         `logHash` is the keccak256 of the full agent_log.json entry — this creates
     *         a tamper-evident audit trail without storing the full log on-chain.
     *
     * @param agentId       The agent that executed
     * @param logHash       keccak256(agent_log entry JSON)
     * @param amountSettled USDC amount settled (6 decimals), 0 for non-payment executions
     * @param success       Whether the execution succeeded
     */
    function logExecution(
        bytes32 agentId,
        bytes32 logHash,
        uint256 amountSettled,
        bool    success
    ) external override agentExists(agentId) {
        AgentRecord storage agent = _agents[agentId];

        if (msg.sender != agent.wallet && msg.sender != agent.operator) revert UnauthorizedLogger();

        agent.lastActiveAt = uint64(block.timestamp);

        unchecked { agent.executionCount += 1; }

        if (amountSettled > 0) {
            unchecked { agent.totalSettled += uint128(amountSettled); }
        }

        // Update reputation — simple EMA: weight 95% history, 5% new result
        // success = +10000 bps signal, failure = 0 bps signal
        uint16 oldScore = agent.reputationScore;
        uint16 newScore;
        unchecked {
            uint256 signal = success ? 10000 : 0;
            newScore = uint16((uint256(oldScore) * 95 + signal * 5) / 100);
        }
        agent.reputationScore = newScore;

        emit ExecutionLogged(agentId, logHash, amountSettled, success);

        if (newScore != oldScore) {
            emit ReputationUpdated(agentId, oldScore, newScore);
        }
    }

    function pauseAgent(bytes32 agentId)
        external override agentExists(agentId) onlyOperator(agentId) agentNotRevoked(agentId)
    {
        if (_agents[agentId].status != Status.Active) revert NotActive();
        _agents[agentId].status = Status.Paused;
        emit AgentPaused(agentId, msg.sender);
    }

    function resumeAgent(bytes32 agentId)
        external override agentExists(agentId) onlyOperator(agentId) agentNotRevoked(agentId)
    {
        if (_agents[agentId].status != Status.Paused) revert NotPaused();
        _agents[agentId].status = Status.Active;
        emit AgentResumed(agentId, msg.sender);
    }

    function revokeAgent(bytes32 agentId)
        external override agentExists(agentId) onlyOperator(agentId)
    {
        _agents[agentId].status = Status.Revoked;
        emit AgentRevoked(agentId, msg.sender);
    }

    function updateManifest(bytes32 agentId, bytes32 newManifestHash)
        external override agentExists(agentId) onlyOperator(agentId) agentNotRevoked(agentId)
    {
        if (newManifestHash == bytes32(0)) revert EmptyManifest();
        bytes32 old = _agents[agentId].manifestHash;
        _agents[agentId].manifestHash = newManifestHash;
        emit ManifestUpdated(agentId, old, newManifestHash);
    }

    // ------------------------------------------------------------
    //                       View Functions
    // ------------------------------------------------------------

    function getAgent(bytes32 agentId)
        external view override agentExists(agentId)
        returns (AgentRecord memory)
    {
        return _agents[agentId];
    }

    function isActive(bytes32 agentId) external view override returns (bool) {
        return _agents[agentId].status == Status.Active;
    }

    function getWallet(bytes32 agentId)
        external view override agentExists(agentId)
        returns (address)
    {
        return _agents[agentId].wallet;
    }

    function getOperator(bytes32 agentId)
        external view override agentExists(agentId)
        returns (address)
    {
        return _agents[agentId].operator;
    }

    function getAgentsByOperator(address operator) external view returns (bytes32[] memory) {
        return _operatorAgents[operator];
    }
}
