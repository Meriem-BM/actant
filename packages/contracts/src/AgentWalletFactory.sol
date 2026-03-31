// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentWallet.sol";
import "./AgentRegistry.sol";
import "./interfaces/IAgentRegistry.sol";

/**
 * @title  AgentWalletFactory
 * @notice Deploys ERC-4337 AgentWallets and registers them in AgentRegistry atomically.
 *
 *  Uses ERC-1167 minimal proxies (clones) with CREATE2 for deterministic addresses.
 *  Every createWallet() call does three things in one transaction:
 *  1. Deploys a minimal proxy pointing to the AgentWallet implementation
 *  2. Initializes the wallet (owner, limits, registry link)
 *  3. Registers the agent in AgentRegistry with ERC-8004 identity
 *
 *  Operators can pre-compute their wallet address with getWalletAddress() before
 *  funding it, so the wallet can be funded before it is deployed.
 */
contract AgentWalletFactory {

    // ------------------------------------------------------------
    //                       State Variables
    // ------------------------------------------------------------

    /// @notice AgentWallet implementation — all proxies delegate to this.
    address public immutable implementation;

    /// @notice AgentRegistry — ERC-8004 identity and reputation.
    AgentRegistry public immutable registry;

    /// @notice USDC address for this deployment.
    address public immutable usdc;

    /// @notice agentId => deployed wallet address.
    mapping(bytes32 => address) public wallets;

    // ------------------------------------------------------------
    //                           Events
    // ------------------------------------------------------------

    event WalletCreated(
        bytes32 indexed agentId,
        address indexed wallet,
        address indexed operator,
        uint256 dailyLimit,
        uint256 perTxLimit
    );

    // ------------------------------------------------------------
    //                         Constructor
    // ------------------------------------------------------------

    constructor(address _implementation, address _registry, address _usdc) {
        implementation = _implementation;
        registry       = AgentRegistry(_registry);
        usdc           = _usdc;
    }

    // ------------------------------------------------------------
    //                     External Functions
    // ------------------------------------------------------------

    /**
     * @notice Deploy a new agent wallet and register it in the AgentRegistry.
     *
     * @param agentId      bytes32 agent identity — use keccak256(abi.encode(name, operator, salt))
     * @param owner        EOA that will sign UserOperations for this agent
     * @param dailyLimit   Max USDC per 24h window (6 decimals). e.g. 50 USDC = 50_000_000
     * @param perTxLimit   Max USDC per transaction (6 decimals). e.g. 5 USDC = 5_000_000
     * @param manifestHash keccak256 of the agent's capability manifest (agent.json)
     * @return wallet      Address of the deployed AgentWallet
     */
    function createWallet(
        bytes32 agentId,
        address owner,
        uint256 dailyLimit,
        uint256 perTxLimit,
        bytes32 manifestHash
    ) external returns (address wallet) {
        require(wallets[agentId] == address(0), "Factory: agentId already deployed");
        require(owner        != address(0), "Factory: zero owner");
        require(dailyLimit   > 0,           "Factory: zero daily limit");
        require(perTxLimit   > 0,           "Factory: zero per-tx limit");
        require(perTxLimit   <= dailyLimit,  "Factory: perTx > daily");
        require(manifestHash != bytes32(0), "Factory: empty manifest");

        bytes32 salt = keccak256(abi.encode(agentId, owner));
        wallet = _cloneDeterministic(implementation, salt);

        AgentWallet(payable(wallet)).initialize(
            owner,
            agentId,
            address(registry),
            usdc,
            dailyLimit,
            perTxLimit
        );

        // operator = msg.sender (the party calling createWallet)
        registry.registerAgent(agentId, wallet, msg.sender, manifestHash);

        wallets[agentId] = wallet;

        emit WalletCreated(agentId, wallet, msg.sender, dailyLimit, perTxLimit);
    }

    /**
     * @notice Compute the deterministic address for an agent wallet before deployment.
     *         Fund this address with USDC before calling createWallet().
     */
    function getWalletAddress(bytes32 agentId, address owner)
        external view returns (address predicted)
    {
        bytes32 salt = keccak256(abi.encode(agentId, owner));
        predicted = _predictCloneAddress(implementation, salt);
    }

    // ------------------------------------------------------------
    //                      Internal Functions
    // ------------------------------------------------------------

    function _cloneDeterministic(address impl, bytes32 salt)
        internal returns (address instance)
    {
        bytes memory creationCode = _cloneBytecode(impl);
        assembly {
            instance := create2(0, add(creationCode, 32), mload(creationCode), salt)
        }
        require(instance != address(0), "Factory: CREATE2 failed");
    }

    function _predictCloneAddress(address impl, bytes32 salt)
        internal view returns (address predicted)
    {
        bytes32 bytecodeHash = keccak256(_cloneBytecode(impl));
        predicted = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            bytecodeHash
        )))));
    }

    function _cloneBytecode(address impl) internal pure returns (bytes memory) {
        return abi.encodePacked(
            hex"3d602d80600a3d3981f3363d3d373d3d3d363d73",
            impl,
            hex"5af43d82803e903d91602b57fd5bf3"
        );
    }
}
