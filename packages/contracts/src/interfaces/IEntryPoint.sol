// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @notice Minimal IEntryPoint interface needed by AgentWallet.
 *         Full spec: https://eips.ethereum.org/EIPS/eip-4337
 */
interface IEntryPoint {
    /**
     * @notice UserOperation — the core ERC-4337 transaction type.
     */
    struct UserOperation {
        address sender;
        uint256 nonce;
        bytes   initCode;
        bytes   callData;
        uint256 callGasLimit;
        uint256 verificationGasLimit;
        uint256 preVerificationGas;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        bytes   paymasterAndData;
        bytes   signature;
    }

    function getNonce(address sender, uint192 key) external view returns (uint256 nonce);
    function depositTo(address account) external payable;
    function balanceOf(address account) external view returns (uint256);
}
