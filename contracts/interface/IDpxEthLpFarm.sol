// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.9;

interface IDpxEthLpFarm {
    function claim() external;
    function stake(uint256 amount) external;
    function addToContractWhitelist(address owner) external;
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}