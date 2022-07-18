// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 * NOTE: Modified to include symbols and decimals.
 */
interface IFEE {
    struct FeeStructure {
        /// @dev Purchase Fee in 1e8: x% of the price of the underlying asset * the amount of options being bought
        uint256 purchaseFeePercentage;
        /// @dev Settlement Fee in 1e8: x% of the settlement price
        uint256 settlementFeePercentage;
    }

    function updateSsovFeeStructure(
        address ssov,
        FeeStructure calldata feeStructure
    ) external;
}
