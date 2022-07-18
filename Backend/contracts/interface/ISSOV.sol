// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.9;

interface ISSOV {
    struct VaultCheckpoint {
        uint256 premiumCollectedCumulative;
        uint256 activeCollateral;
        uint256 totalCollateral;
        uint256 activeCollateralRatio;
        uint256 premiumDistributionRatio;
        uint256[] rewardDistributionRatios;
    }

    struct EpochStrikeData {
        /// Address of the strike token
        address strikeToken;
        /// Last checkpoint for the vault for an epoch for a strike
        VaultCheckpoint lastVaultCheckpoint;
        uint256[] rewardsStoredForPremiums;
        uint256[] rewardsDistributionRatiosForPremiums;
    }

    function purchase(
        uint256 strikeIndex,
        uint256 amount,
        address user
    ) external returns (uint256 premium, uint256 totalFee);

    function deposit(
        uint256 strikeIndex,
        uint256 amount,
        address user
    ) external returns (uint256 tokenId);

    function calculatePremium(
        uint256 _strike,
        uint256 _amount,
        uint256 _expiry
    ) external view returns (uint256 premium);

    function currentEpoch() external view returns (uint256 epoch);

    function calculatePurchaseFees(uint256 strike, uint256 amount)
        external
        view
        returns (uint256);

    function getEpochStrikes(uint256 epoch)
        external
        view
        returns (uint256[] memory);

    function getEpochTimes(uint256 epoch)
        external
        view
        returns (uint256 start, uint256 end);

    function addToContractWhitelist(address owner) external;

    function getEpochStrikeData(uint256 epoch, uint256 strike)
        external
        view
        returns (EpochStrikeData memory);

    function getCollateralPrice() external view returns (uint256);

    function collateralPrecision() external view returns (uint256);
}
