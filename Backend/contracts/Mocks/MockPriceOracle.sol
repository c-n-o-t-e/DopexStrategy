// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract DpxPutPriceOracleMock {
    uint256 public virtualPriceInDollars;
    uint256 public priceInDollars;

    constructor() {}

    /// @notice set the collateral price
    function setCollateralPrice(uint256 _virtualPriceInDollars) external {
        virtualPriceInDollars = _virtualPriceInDollars;
    }

    /// @notice set the underlying price
    function setUnderlyingPrice(uint256 _priceInDollars) external {
        priceInDollars = _priceInDollars;
    }

    /// @notice Returns the collateral price
    function getCollateralPrice() external view returns (uint256) {
        return virtualPriceInDollars;
    }

    /// @notice Returns the underlying price
    function getUnderlyingPrice() external view returns (uint256) {
        return priceInDollars;
    }
}
