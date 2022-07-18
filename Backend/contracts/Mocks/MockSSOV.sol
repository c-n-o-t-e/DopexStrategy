// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../interface/ISSOV.sol";
import "../interface/I2Pool.sol";
import "../interface/IERC721TokenReceiver.sol";

contract MockSSOV is ERC721TokenReceiver {
    function deposit(
        address _ssovAddress,
        uint256 _strikeIndex,
        uint256 _amount
    ) external {
        IERC20(0x7f90122BF0700F9E7e1F688fe926940E8839F353).approve(
            _ssovAddress,
            IERC20(0x7f90122BF0700F9E7e1F688fe926940E8839F353).balanceOf(
                address(this)
            )
        );
        ISSOV(_ssovAddress).deposit(_strikeIndex, _amount, address(this));
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) external virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
