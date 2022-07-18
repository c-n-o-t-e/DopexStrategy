// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.9;

import "./IERC20.sol";

interface I2Pool is IERC20 {
    function coins(uint256 arg0) external returns (address);

    function calc_token_amount(uint256[2] calldata amounts, bool _h)
        external
        returns (uint256);

    function add_liquidity(
        uint256[2] memory _deposit_amounts,
        uint256 _min_mint_amount
    ) external returns (uint256);
}
