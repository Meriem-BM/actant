// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IAccount.sol";
import "./interfaces/IEntryPoint.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IAgentRegistry.sol";

/**
 * @title  AgentWallet
 * @notice ERC-4337 smart contract execution account for autonomous AI agents.
 *
 *  Each agent gets its own AgentWallet — a programmable account that:
 *  1. Validates ERC-4337 UserOperations signed by the owner key
 *  2. Enforces on-chain spend policy (daily cap + per-transaction cap)
 *  3. Settles USDC payments without any human approval in the hot path
 *  4. Logs every execution to the AgentRegistry for ERC-8004 reputation tracking
 *  5. Can be instantly paused by the operator via the registry
 *
 *  Deployed via AgentWalletFactory using ERC-1167 minimal proxies (CREATE2).
 *  Gas is sponsored by the operator's paymaster or prepaid into the EntryPoint.
 */
contract AgentWallet is IAccount {

    // ------------------------------------------------------------
    //                         Constants
    // ------------------------------------------------------------

    /// @notice ERC-4337 EntryPoint v0.6 on Base.
    address public constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;

    /// @notice USDC on Base mainnet (6 decimals).
    address public constant USDC_MAINNET = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    /// @notice USDC on Base Sepolia (6 decimals).
    address public constant USDC_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    uint256 private constant SIG_VALIDATION_FAILED  = 1;
    uint256 private constant SIG_VALIDATION_SUCCESS = 0;
    bytes4  private constant ERC1271_MAGIC          = 0x1626ba7e;

    // ------------------------------------------------------------
    //                       State Variables
    // ------------------------------------------------------------

    /// @notice Owner signing key — the EOA that signs UserOperations.
    address public owner;

    /// @notice AgentRegistry address — provides ERC-8004 identity + pause authority.
    address public registry;

    /// @notice This agent's ERC-8004 id.
    bytes32 public agentId;

    /// @notice USDC token address (set at init — supports mainnet + sepolia).
    address public usdc;

    /// @notice Daily USDC spend cap (6 decimals).
    uint256 public dailyLimit;

    /// @notice Per-transaction USDC cap (6 decimals).
    uint256 public perTxLimit;

    /// @notice USDC spent in the current day window (resets at UTC midnight).
    uint256 public dailySpent;

    /// @notice Unix timestamp of the start of the current spend window.
    uint256 public windowStart;

    /// @notice Optional allowlist — if non-empty, only these recipients are permitted.
    mapping(address => bool) public allowedRecipients;
    bool public hasAllowlist;

    // ------------------------------------------------------------
    //                           Events
    // ------------------------------------------------------------

    event Initialized(
        address indexed owner,
        bytes32 indexed agentId,
        uint256 dailyLimit,
        uint256 perTxLimit
    );
    event PaymentSent(
        address indexed to,
        uint256 amount,
        string  memo,
        bytes32 logHash
    );
    event LimitsUpdated(uint256 dailyLimit, uint256 perTxLimit);
    event RecipientAllowed(address indexed recipient);
    event RecipientBlocked(address indexed recipient);
    event AllowlistEnabled();
    event AllowlistDisabled();

    // ------------------------------------------------------------
    //                          Modifiers
    // ------------------------------------------------------------

    modifier onlyOwnerOrEntryPoint() {
        require(
            msg.sender == owner || msg.sender == ENTRY_POINT,
            "AgentWallet: unauthorized"
        );
        _;
    }

    modifier notPaused() {
        if (registry != address(0) && agentId != bytes32(0)) {
            require(
                IAgentRegistry(registry).isActive(agentId),
                "AgentWallet: agent paused or revoked"
            );
        }
        _;
    }

    // ------------------------------------------------------------
    //                         Initializer
    // ------------------------------------------------------------

    /**
     * @notice Initialize the wallet (called by factory after clone deployment).
     * @param _owner      EOA that signs UserOperations
     * @param _agentId    ERC-8004 agent identity id
     * @param _registry   AgentRegistry contract address
     * @param _usdc       USDC contract address for this chain
     * @param _dailyLimit Daily USDC spend cap (6 decimals)
     * @param _perTxLimit Per-transaction USDC cap (6 decimals)
     */
    function initialize(
        address _owner,
        bytes32 _agentId,
        address _registry,
        address _usdc,
        uint256 _dailyLimit,
        uint256 _perTxLimit
    ) external {
        require(owner == address(0), "AgentWallet: already initialized");
        require(_owner != address(0), "AgentWallet: zero owner");

        owner      = _owner;
        agentId    = _agentId;
        registry   = _registry;
        usdc       = _usdc;
        dailyLimit = _dailyLimit;
        perTxLimit = _perTxLimit;
        windowStart = _startOfDay(block.timestamp);

        emit Initialized(_owner, _agentId, _dailyLimit, _perTxLimit);
    }

    // ------------------------------------------------------------
    //                     External Functions
    // ------------------------------------------------------------

    /**
     * @notice Validate a UserOperation. Called by the EntryPoint before execution.
     */
    function validateUserOp(
        IEntryPoint.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        require(msg.sender == ENTRY_POINT, "AgentWallet: not EntryPoint");

        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash)
        );
        address recovered = _recoverSigner(ethHash, userOp.signature);

        if (recovered != owner) {
            return SIG_VALIDATION_FAILED;
        }

        if (missingAccountFunds > 0) {
            (bool ok,) = payable(ENTRY_POINT).call{value: missingAccountFunds}("");
            require(ok, "AgentWallet: ETH transfer to EntryPoint failed");
        }

        return SIG_VALIDATION_SUCCESS;
    }

    /**
     * @notice Execute an arbitrary call.
     *
     * @dev    USDC transfers must go through pay() — calling usdc.transfer() or
     *         usdc.approve() directly would bypass the daily/per-tx spend caps and
     *         the pause check. Both are blocked here.
     */
    function execute(
        address to,
        uint256 value,
        bytes calldata data
    ) external onlyOwnerOrEntryPoint notPaused {
        require(
            to != usdc,
            "AgentWallet: direct USDC calls disallowed — use pay()"
        );

        (bool success, bytes memory returnData) = to.call{value: value}(data);
        if (!success) {
            if (returnData.length > 0) {
                assembly { revert(add(returnData, 32), mload(returnData)) }
            }
            revert("AgentWallet: execution failed");
        }
    }

    /**
     * @notice Batch-execute multiple calls in one UserOperation.
     *
     * @dev    Same USDC restriction as execute() — no target may be the USDC token.
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[]   calldata datas
    ) external onlyOwnerOrEntryPoint notPaused {
        require(
            targets.length == values.length && values.length == datas.length,
            "AgentWallet: array length mismatch"
        );
        for (uint256 i = 0; i < targets.length; i++) {
            require(
                targets[i] != usdc,
                "AgentWallet: direct USDC calls disallowed — use pay()"
            );
            (bool ok, bytes memory ret) = targets[i].call{value: values[i]}(datas[i]);
            if (!ok) {
                if (ret.length > 0) {
                    assembly { revert(add(ret, 32), mload(ret)) }
                }
                revert("AgentWallet: batch execution failed");
            }
        }
    }

    /**
     * @notice Send a USDC payment — the core agent settlement primitive.
     *
     *  Checks (in order):
     *  1. Agent is not paused / revoked in the registry
     *  2. Amount ≤ perTxLimit
     *  3. Daily spend window is current; resets if a new UTC day has started
     *  4. dailySpent + amount ≤ dailyLimit
     *  5. Recipient is on the allowlist (if enabled)
     *
     *  After a successful transfer, logs the execution to AgentRegistry
     *  so the event appears on-chain for ERC-8004 reputation tracking.
     *
     * @param to     Recipient address
     * @param amount Amount in USDC (6 decimals)
     * @param memo   Human-readable payment reason (indexed off-chain)
     */
    function pay(
        address to,
        uint256 amount,
        string calldata memo
    ) external onlyOwnerOrEntryPoint notPaused {
        require(to     != address(0), "AgentWallet: zero recipient");
        require(amount > 0,           "AgentWallet: zero amount");
        require(amount <= perTxLimit, "AgentWallet: exceeds per-tx limit");

        // Reset daily window if a new UTC day has started
        uint256 today = _startOfDay(block.timestamp);
        if (today > windowStart) {
            windowStart = today;
            dailySpent  = 0;
        }

        require(dailySpent + amount <= dailyLimit, "AgentWallet: daily limit exceeded");

        if (hasAllowlist) {
            require(allowedRecipients[to], "AgentWallet: recipient not allowed");
        }

        dailySpent += amount;
        require(IERC20(usdc).transfer(to, amount), "AgentWallet: USDC transfer failed");

        // Build log hash — committed to registry for ERC-8004 audit trail
        bytes32 logHash = keccak256(abi.encode(
            agentId, to, amount, memo, block.timestamp, block.number
        ));

        emit PaymentSent(to, amount, memo, logHash);

        // Commit to registry — best-effort, never revert the payment on registry failure
        if (registry != address(0) && agentId != bytes32(0)) {
            try IAgentRegistry(registry).logExecution(agentId, logHash, amount, true) {}
            catch {}
        }
    }

    function updateLimits(uint256 _dailyLimit, uint256 _perTxLimit)
        external onlyOwnerOrEntryPoint
    {
        dailyLimit = _dailyLimit;
        perTxLimit = _perTxLimit;
        emit LimitsUpdated(_dailyLimit, _perTxLimit);
    }

    function allowRecipient(address recipient) external onlyOwnerOrEntryPoint {
        allowedRecipients[recipient] = true;
        if (!hasAllowlist) {
            hasAllowlist = true;
            emit AllowlistEnabled();
        }
        emit RecipientAllowed(recipient);
    }

    function blockRecipient(address recipient) external onlyOwnerOrEntryPoint {
        allowedRecipients[recipient] = false;
        emit RecipientBlocked(recipient);
    }

    function disableAllowlist() external onlyOwnerOrEntryPoint {
        hasAllowlist = false;
        emit AllowlistDisabled();
    }

    function withdrawETH(address payable to, uint256 amount) external onlyOwnerOrEntryPoint {
        (bool ok,) = to.call{value: amount}("");
        require(ok, "AgentWallet: ETH withdraw failed");
    }

    // ------------------------------------------------------------
    //                       View Functions
    // ------------------------------------------------------------

    /// @notice ERC-1271 smart contract signature validation.
    function isValidSignature(bytes32 hash, bytes calldata signature)
        external view returns (bytes4)
    {
        address signer = _recoverSigner(hash, signature);
        return signer == owner ? ERC1271_MAGIC : bytes4(0);
    }

    /// @notice Returns the nonce from the EntryPoint (ERC-4337 compatible).
    function getNonce() external view returns (uint256) {
        return IEntryPoint(ENTRY_POINT).getNonce(address(this), 0);
    }

    // ------------------------------------------------------------
    //                         Receive ETH
    // ------------------------------------------------------------

    receive() external payable {}

    // ------------------------------------------------------------
    //                      Internal Functions
    // ------------------------------------------------------------

    function _startOfDay(uint256 timestamp) internal pure returns (uint256) {
        return (timestamp / 1 days) * 1 days;
    }

    function _recoverSigner(bytes32 hash, bytes memory sig)
        internal pure returns (address)
    {
        require(sig.length == 65, "AgentWallet: bad signature length");
        bytes32 r;
        bytes32 s;
        uint8   v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "AgentWallet: invalid v");
        address signer = ecrecover(hash, v, r, s);
        require(signer != address(0), "AgentWallet: ecrecover failed");
        return signer;
    }
}
