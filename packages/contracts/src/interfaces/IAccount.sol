// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IEntryPoint.sol";

/**
 * @notice ERC-4337 IAccount interface.
 */
interface IAccount {
    /**
     * @notice Validate a UserOperation.
     * @param userOp          The operation being validated.
     * @param userOpHash      Hash of the UserOperation (signed by the owner).
     * @param missingAccountFunds ETH required to cover gas — must be sent to EntryPoint.
     * @return validationData 0 = success, 1 = failure, or packed (aggregator, validAfter, validUntil)
     */
    function validateUserOp(
        IEntryPoint.UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData);
}
