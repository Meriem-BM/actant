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
        require(msg.sender == owner, "AgentRegistry: not owner");
        _;
    }

    modifier onlyOperator(bytes32 agentId) {
        require(_agents[agentId].operator == msg.sender, "AgentRegistry: not operator");
        _;
    }

    modifier agentExists(bytes32 agentId) {
        require(_agents[agentId].registeredAt != 0, "AgentRegistry: agent not found");
        _;
    }

    modifier agentNotRevoked(bytes32 agentId) {
        require(_agents[agentId].status != Status.Revoked, "AgentRegistry: agent revoked");
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
        require(factory != address(0), "AgentRegistry: zero factory");
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
        require(
            msg.sender == operator || trustedFactories[msg.sender],
            "AgentRegistry: caller must be operator or trusted factory"
        );
        require(_agents[agentId].registeredAt == 0, "AgentRegistry: agentId taken");
        require(wallet       != address(0), "AgentRegistry: zero wallet");
        require(operator     != address(0), "AgentRegistry: zero operator");
        require(manifestHash != bytes32(0), "AgentRegistry: empty manifest");

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

        require(
            msg.sender == agent.wallet || msg.sender == agent.operator,
            "AgentRegistry: unauthorized logger"
        );

        agent.lastActiveAt    = uint64(block.timestamp);
        agent.executionCount += 1;

        if (amountSettled > 0) {
            agent.totalSettled += uint128(amountSettled);
        }

        // Update reputation — simple EMA: weight 95% history, 5% new result
        // success = +10000 bps signal, failure = 0 bps signal
        uint16 signal   = success ? 10000 : 0;
        uint16 newScore = uint16(
            (uint256(agent.reputationScore) * 95 + uint256(signal) * 5) / 100
        );
        uint16 oldScore = agent.reputationScore;
        agent.reputationScore = newScore;

        emit ExecutionLogged(agentId, logHash, amountSettled, success);

        if (newScore != oldScore) {
            emit ReputationUpdated(agentId, oldScore, newScore);
        }
    }

    function pauseAgent(bytes32 agentId)
        external override agentExists(agentId) onlyOperator(agentId) agentNotRevoked(agentId)
    {
        require(_agents[agentId].status == Status.Active, "AgentRegistry: not active");
        _agents[agentId].status = Status.Paused;
        emit AgentPaused(agentId, msg.sender);
    }

    function resumeAgent(bytes32 agentId)
        external override agentExists(agentId) onlyOperator(agentId) agentNotRevoked(agentId)
    {
        require(_agents[agentId].status == Status.Paused, "AgentRegistry: not paused");
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
        require(newManifestHash != bytes32(0), "AgentRegistry: empty manifest");
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
