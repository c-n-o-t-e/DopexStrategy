// SPDX-License-Identifier: UNLICENSED

/// @summary: Contract stakes DPX/WETH lp claim rewards weekly, converts DPX claimed to USDC, adds USDC
///           to curve 2pool, gets 2CRV, uses 2CRV to purchase puts and write puts.
/// @title: Dopex Strategy
/// @author: c-n-o-t-e

pragma solidity ^0.8.9;

import "./SafeERC20.sol";
import "./interface/ISSOV.sol";
import "./interface/I2Pool.sol";
import "./interface/IDpxEthLpFarm.sol";
import "./interface/ISushiSwapRouter.sol";
import "./interface/IERC721TokenReceiver.sol";

error DopexStrategy_NotOwner();
error DopexStrategy_EpochExpired();
error DopexStrategy_NotUpToAWeek();
error DopexStrategy_InvalidStike();
error DopexStrategy_InvalidAmount();
error DopexStrategy_InvalidAddress();
error DopexStrategy_AmountAboveBalance();
error DopexStrategy_ReducePurchasePercent();
error DopexStrategy_ContractHasNoDpxToken();
error DopexStrategy_NoAvailableCollateral();
error DopexStrategy_ContractHasNo2crvToken();
error DopexStrategy_ContractHasNoUsdcToken();

contract DopexStrategy is ERC721TokenReceiver {
    using SafeERC20 for IERC20;
    event StrategyExecuted(
        uint256 indexed contractDpxBalanceBeforeTx,
        uint256 contractUsdcBalanceBeforeTx,
        uint256 contract2PoolBalanceBeforeTx,
        uint256 amountUsedForPurchase,
        uint256 purchaseOption,
        uint256 writeAmount
    );

    // s indicating variables are stored in storage
    uint256 public s_timer;
    address public s_owner;

    I2Pool public immutable pool;
    ISushiSwapRouter public immutable router;
    IDpxEthLpFarm public immutable dpxEthLpFarm;

    address constant dpx = 0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55;
    address constant usdc = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
    address constant weth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address constant twoPool = 0x7f90122BF0700F9E7e1F688fe926940E8839F353;
    address constant DpxEthLp = 0x0C1Cf6883efA1B496B01f654E247B9b419873054;

    constructor(
        address _dpxEthLpFarm,
        address _sushiRouter,
        address _curvePool
    ) {
        s_owner = msg.sender;

        pool = I2Pool(_curvePool);
        router = ISushiSwapRouter(_sushiRouter);
        dpxEthLpFarm = IDpxEthLpFarm(_dpxEthLpFarm);

        IERC20(usdc).safeApprove(twoPool, type(uint256).max);
        IERC20(dpx).safeApprove(address(router), type(uint256).max);
        IERC20(DpxEthLp).safeApprove(_dpxEthLpFarm, type(uint256).max);
    }

    /// @notice deposits DPX/WETH lp and stake in dpxEthLpFarm
    /// - this contract must be whitelisted by the dpxEthLpFarm contract
    /// - this contract must have been approved _amount
    /// - set timer if it's the first interaction
    /// @param _amount amount of DPX/WETH pair
    function deposit(uint256 _amount) external {
        if (_amount == 0) revert DopexStrategy_InvalidAmount();

        if (_amount > IERC20(DpxEthLp).balanceOf(msg.sender))
            revert DopexStrategy_AmountAboveBalance();

        IERC20(DpxEthLp).safeTransferFrom(msg.sender, address(this), _amount);
        dpxEthLpFarm.stake(_amount);

        // making this unchecked to save gas used for checking arithmetic operations
        unchecked {
            if (s_timer == 0) s_timer = block.timestamp + 7 days;
        }
    }

    /// @notice runs strategy
    /// - this contract must be whitelisted by the SSOV contract
    /// - only works when timer is below block.timestamp
    /// @param _strikeIndex strikeIndex Index of strike
    /// @param _sushiSlippage minimum slippage when using the _swap function....i.e 95% will be 950
    /// @param _curveSlippage minimum slippage when using the _get2poolToken function....i.e 95% will be 950
    /// @param _ssovAddress address of SSOV to purchase and write puts
    function runStrategy(
        uint256 _strikeIndex,
        uint256 _sushiSlippage,
        uint256 _curveSlippage,
        address _ssovAddress
    ) external onlyOwner {
        if (_sushiSlippage == 0 || _curveSlippage == 0)
            revert DopexStrategy_InvalidAmount();

        if (_ssovAddress == address(0)) revert DopexStrategy_InvalidAddress();

        if (s_timer > block.timestamp) revert DopexStrategy_NotUpToAWeek();
        dpxEthLpFarm.claim();

        uint256 contractDpxBalanceBeforeTx = _getBalance(dpx);
        _swap(_sushiSlippage);

        uint256 contractUsdcBalanceBeforeTx = _getBalance(usdc);
        _get2poolToken(IERC20(usdc).balanceOf(address(this)), _curveSlippage);

        uint256 contract2PoolBalanceBeforeTx = _getBalance(twoPool);
        (
            uint256 purchaseOption,
            uint256 writeAmount,
            uint256 amountUsedForPurchase
        ) = _excuteStrategy(_ssovAddress, _strikeIndex);

        unchecked {
            s_timer = block.timestamp + 7 days;
        }

        emit StrategyExecuted(
            contractDpxBalanceBeforeTx,
            contractUsdcBalanceBeforeTx,
            contract2PoolBalanceBeforeTx,
            amountUsedForPurchase,
            purchaseOption,
            writeAmount
        );
    }

    /// @notice withdraws token
    /// - only owner can call this function
    /// @param _token token to withdraw from
    /// @param _to receivers address
    /// @param _amount amount to withdraw
    function withdraw(
        address _token,
        address _to,
        uint256 _amount
    ) external onlyOwner {
        if (_token == address(0) || _to == address(0))
            revert DopexStrategy_InvalidAddress();

        if (_amount == 0) revert DopexStrategy_InvalidAmount();

        if (_amount > IERC20(_token).balanceOf(address(this)))
            revert DopexStrategy_AmountAboveBalance();

        IERC20(_token).safeTransfer(_to, _amount);
    }

    /// @notice checks this contract balance
    /// - checks balance and revert if equals to 0
    /// @param _token contract address to get balance from
    function _getBalance(address _token)
        internal
        view
        returns (uint256 contractBalance)
    {
        contractBalance = IERC20(_token).balanceOf(address(this));
        if (contractBalance < 0 && _token == dpx)
            revert DopexStrategy_ContractHasNoDpxToken();
        if (contractBalance < 0 && _token == usdc)
            revert DopexStrategy_ContractHasNoUsdcToken();
        if (contractBalance < 0 && _token == twoPool)
            revert DopexStrategy_ContractHasNo2crvToken();
    }

    /// @notice swaps DPX to USDC
    /// @param _sushiSlippage minimum slippage when using the _swap function....i.e 95% will be 950
    function _swap(uint256 _sushiSlippage) internal {
        address[] memory path = new address[](3);
        path[0] = dpx;
        path[1] = weth;
        path[2] = usdc;

        uint256[] memory amountsMin = router.getAmountsOut(
            IERC20(dpx).balanceOf(address(this)),
            path
        );
        uint256 sushiSlippage = (amountsMin[path.length - 1] * _sushiSlippage) /
            1000;

        router.swapExactTokensForTokens(
            IERC20(dpx).balanceOf(address(this)),
            sushiSlippage,
            path,
            address(this),
            block.timestamp
        );
    }

    /// @notice add contract USDC to curve 2pool
    /// @param _contractUsdcBalance USDC balance of this contract
    /// @param _curveSlippage minimum slippage when using the _get2poolToken function....i.e 95% will be 950
    function _get2poolToken(
        uint256 _contractUsdcBalance,
        uint256 _curveSlippage
    ) internal {
        uint256[2] memory deposit_amounts;
        uint256 amountMin;

        if (pool.coins(0) == usdc) {
            deposit_amounts[0] = _contractUsdcBalance;
            deposit_amounts[1] = 0;
        } else if (pool.coins(1) == usdc) {
            deposit_amounts[0] = 0;
            deposit_amounts[1] = _contractUsdcBalance;
        }

        amountMin = pool.calc_token_amount(deposit_amounts, true);
        uint256 curveSlippage = (amountMin * _curveSlippage) / 1000;
        pool.add_liquidity(deposit_amounts, curveSlippage);
    }

    /// @notice excutes strategy
    /// - this contract must be whitelisted by the SSOV contract
    /// - only works when timer is below block.timestamp
    /// @param _ssovAddress address of SSOV to purchase and write puts
    /// @param _strikeIndex strikeIndex Index of strike
    function _excuteStrategy(
        address _ssovAddress,
        uint256 _strikeIndex
    )
        internal
        returns (
            uint256 purchaseOption,
            uint256 writeAmount,
            uint256 amountUsedForPurchase
        )
    {
        uint256 epoch = ISSOV(_ssovAddress).currentEpoch();
        (, uint256 epochExpiry) = ISSOV(_ssovAddress).getEpochTimes(epoch);

        if (block.timestamp > epochExpiry) revert DopexStrategy_EpochExpired();
        uint256[] memory strikes = ISSOV(_ssovAddress).getEpochStrikes(epoch);

        uint256 strike = strikes[_strikeIndex];
        if (strike <= 0) revert DopexStrategy_InvalidStike();

        ISSOV.EpochStrikeData memory collateralData = ISSOV(_ssovAddress)
            .getEpochStrikeData(epoch, strike);

        uint256 availableCollateral = collateralData
            .lastVaultCheckpoint
            .totalCollateral -
            collateralData.lastVaultCheckpoint.activeCollateral;

        if (0 >= availableCollateral)
            revert DopexStrategy_NoAvailableCollateral();
        uint256 contractBalance = IERC20(twoPool).balanceOf(address(this));

        if (availableCollateral > contractBalance) {
            // get some options the contract can buy
            uint256 optionUserCanAfford = (contractBalance *
                ISSOV(_ssovAddress).getCollateralPrice() *
                1e18) / (strike * ISSOV(_ssovAddress).collateralPrecision());

            purchaseOption = getPurchaseOption(
                _ssovAddress,
                strike,
                optionUserCanAfford,
                epochExpiry,
                contractBalance
            );
        } else {
            // if contractBalance is higher than availableCollateral in the SSOV contract we buy all available options
            purchaseOption =
                (availableCollateral *
                    ISSOV(_ssovAddress).getCollateralPrice() *
                    1e18) /
                (strike * ISSOV(_ssovAddress).collateralPrecision());
        }

        IERC20(twoPool).safeApprove(_ssovAddress, contractBalance);

        ISSOV(_ssovAddress).purchase(
            _strikeIndex,
            purchaseOption,
            address(this)
        );

        uint256 contract2crvBalanceLeft = IERC20(twoPool).balanceOf(
            address(this)
        );

        amountUsedForPurchase = contractBalance - contract2crvBalanceLeft;

        //write puts with amount left after purchasing puts
        if (contract2crvBalanceLeft > 0) {
            writeAmount = contract2crvBalanceLeft;
            ISSOV(_ssovAddress).deposit(
                _strikeIndex,
                writeAmount,
                address(this)
            );
        }
    }

    function getPurchaseOption(
        address _ssovAddress,
        uint256 _strike,
        uint256 _purchaseOption,
        uint256 _epochExpiry,
        uint256 _balance
    ) internal view returns (uint256 purchaseOption) {
        // gets initial premium and fee
        uint256 premium = ISSOV(_ssovAddress).calculatePremium(
            _strike,
            _purchaseOption,
            _epochExpiry
        );

        uint256 fee = ISSOV(_ssovAddress).calculatePurchaseFees(
            _strike,
            _purchaseOption
        );

        uint256 amountToPurchase = premium + fee;
        purchaseOption = _purchaseOption;

        /*
         *  check if amountToPurchase is lower than contract balance during while loop
         *  where contract balance is lower than SSOV total collateral 
         *  which imply that total contract options can't be higher than
         *  total options gotten from SSOV total collateral 
        **/
        while (_balance > amountToPurchase) {
            if (amountToPurchase * 2 > _balance) {
               /*
                *  Once amountToPurchase can't be multiplied by 2 again
                *  we check if adding half of the initial `premium + fee`
                *  to amountToPurchase and see if thats lower than contract balance
                *  if yes we add half of that and increase purchaseOption as well
                **/
                uint256 buySomeMore = amountToPurchase + (premium + fee) / 2;
                if (buySomeMore > _balance) return purchaseOption;
                else {
                    purchaseOption = purchaseOption + (_purchaseOption / 2);
                    return purchaseOption;
                }
            }

            amountToPurchase = amountToPurchase * 2;
            purchaseOption = purchaseOption * 2;
        }
    }

    function changeOwner(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert DopexStrategy_InvalidAddress();
        s_owner = _newOwner;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) external virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    modifier onlyOwner() {
        if (msg.sender != s_owner) revert DopexStrategy_NotOwner();
        _;
    }
}
