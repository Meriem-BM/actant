// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// TODO: implement full ERC-4337 wallet factory
// Will fork LightAccount (https://github.com/alchemyplatform/light-account)
// and extend with AgentPay-specific spending limit logic.

/**
 * @title AgentWalletFactory
 * @notice Deploys ERC-4337 smart contract wallets for AI agents.
 *         Each wallet is a minimal proxy pointing to the AgentWallet implementation.
 * @dev Skeleton — implementation in progress.
 */
contract AgentWalletFactory {
    // AgentWallet implementation address (set at deploy time)
    address public immutable implementation;

    // Registry: agentId => wallet address
    mapping(bytes32 => address) public wallets;

    event WalletCreated(bytes32 indexed agentId, address indexed wallet, address indexed owner);

    constructor(address _implementation) {
        implementation = _implementation;
    }

    /**
     * @notice Create a new agent wallet.
     * @param agentId Unique identifier for this agent (bytes32 hash of agent name + owner)
     * @param owner   Address that controls the wallet's signing key
     */
    function createWallet(bytes32 agentId, address owner) external returns (address wallet) {
        require(wallets[agentId] == address(0), "AgentWalletFactory: wallet already exists");
        // TODO: deploy minimal proxy clone of implementation
        // wallet = Clones.cloneDeterministic(implementation, agentId);
        // AgentWallet(wallet).initialize(owner);
        // wallets[agentId] = wallet;
        // emit WalletCreated(agentId, wallet, owner);
        revert("AgentWalletFactory: not yet implemented");
    }

    /**
     * @notice Predict the address of a wallet before it's deployed.
     */
    function getWalletAddress(bytes32 agentId) external view returns (address) {
        // TODO: compute deterministic address using CREATE2
        revert("AgentWalletFactory: not yet implemented");
    }
}
