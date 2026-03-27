// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// TODO: fork LightAccount (MIT) and add AgentPay spending limit logic
// Source: https://github.com/alchemyplatform/light-account

/**
 * @title AgentWallet
 * @notice ERC-4337 smart contract wallet for autonomous AI agents.
 *         Extends LightAccount with programmable spending limits:
 *         - Per-transaction USDC cap
 *         - Daily USDC spend limit
 *         - Allowlist of recipient addresses (optional)
 * @dev Skeleton — implementation in progress.
 */
contract AgentWallet {
    // The EntryPoint contract (ERC-4337)
    address public constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;

    // USDC on Base
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    // Owner (signing key controller)
    address public owner;

    // Spending limits
    uint256 public dailyLimit;      // in USDC (6 decimals)
    uint256 public perTxLimit;      // in USDC (6 decimals)

    // Daily spend tracking
    uint256 public dailySpent;
    uint256 public lastResetDay;

    // Optional recipient allowlist (empty = allow all)
    mapping(address => bool) public allowedRecipients;
    bool public hasAllowlist;

    event PaymentSent(address indexed to, uint256 amount, string memo);
    event LimitsUpdated(uint256 daily, uint256 perTx);

    modifier onlyOwnerOrEntryPoint() {
        require(
            msg.sender == owner || msg.sender == ENTRY_POINT,
            "AgentWallet: unauthorized"
        );
        _;
    }

    function initialize(address _owner, uint256 _dailyLimit, uint256 _perTxLimit) external {
        require(owner == address(0), "AgentWallet: already initialized");
        owner = _owner;
        dailyLimit = _dailyLimit;
        perTxLimit = _perTxLimit;
    }

    /**
     * @notice Send USDC payment. Called by the agent via ERC-4337 UserOperation.
     * @param to     Recipient address
     * @param amount Amount in USDC (6 decimals)
     * @param memo   Payment memo (logged for the dashboard)
     */
    function pay(address to, uint256 amount, string calldata memo)
        external
        onlyOwnerOrEntryPoint
    {
        // TODO: implement spending limit checks + USDC transfer
        revert("AgentWallet: not yet implemented");
    }

    // TODO: implement validateUserOp (ERC-4337), execute, executeBatch
}
