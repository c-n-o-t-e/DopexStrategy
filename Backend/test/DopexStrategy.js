const {
  time,
  impersonateAccount,
} = require("@nomicfoundation/hardhat-network-helpers");

const { expect } = require("chai");
const addresses = require("./addresses");
const { fork_network, bne } = require("./network_fork");

describe("DopexStrategy", function () {
  let deployer,
    owner,
    admin,
    fourDays,
    sevenDays,
    dpxWethLp,
    dpxEthLpFarm,
    userBalancer,
    DopexStrategy,
    dopexStrategy;

  beforeEach(async () => {
    await fork_network(18000495); // always get recent block number due to missing trie node error
    [deployer] = await ethers.getSigners();

    fourDays = 4 * 24 * 60 * 60;
    sevenDays = 7 * 24 * 60 * 60;

    DpxWeeklyPutsSsovV3 = await ethers.getContractFactory(
      "DpxWeeklyPutsSsovV3"
    );
    dpxWeeklyPutsSsovV3 = await DpxWeeklyPutsSsovV3.deploy();

    DpxPutPriceOracleMock = await ethers.getContractFactory(
      "DpxPutPriceOracleMock"
    );
    dpxPutPriceOracleMock = await DpxPutPriceOracleMock.deploy();

    DopexStrategy = await ethers.getContractFactory("DopexStrategy");
    dopexStrategy = await DopexStrategy.deploy(
      addresses.dpxEthLpFarm,
      addresses.sushiRouter,
      addresses.curvePool
    );

    Staking = await ethers.getContractFactory("CurveStakingStrategyV1");
    staking = await Staking.deploy(dpxWeeklyPutsSsovV3.address);

    I2pool = await ethers.getContractAt("I2Pool", addresses.twoPool);
    fee = await ethers.getContractAt("IFEE", addresses.feeStrategy);

    dpxWethLp = await ethers.getContractAt(
      "IDpxEthLpFarm",
      addresses.dpxWethLp
    );

    dpxEthLpFarm = await ethers.getContractAt(
      "IDpxEthLpFarm",
      addresses.dpxEthLpFarm
    );

    const contractAddresses = [
      "0x8C73B6D3C81C6CC42e8285c8C147a7563d71Add0",
      staking.address,
      "0x2b99e3D67dAD973c1B9747Da742B7E26c8Bdd67B",
      dpxPutPriceOracleMock.address,
      "0xAEAe470A71fAB319C88b38D21F6ADe73407dD3C0",
      "0x55594cCe8cC0014eA08C49fd820D731308f204c1",
      "0x2e466544aB40ad2a540874AFe470f3f5AcF0Ab10",
    ];

    await dpxWeeklyPutsSsovV3.connect(deployer).setAddresses(contractAddresses);
    await dpxWeeklyPutsSsovV3
      .connect(deployer)
      .changeAllowanceForStakingStrategy(true, bne(10, 35));

    owner = await impersonate(addresses.owner);
    admin = await impersonate(addresses.admin);
    userBalancer = await dpxWethLp.balanceOf(owner.address);

    await fee
      .connect(admin)
      .updateSsovFeeStructure(dpxWeeklyPutsSsovV3.address, ["12500000", "0"]);
  });

  describe("deposit(uint256 _amount)", async () => {
    it("Should fail if user amount to deposit is higher than token balance", async function () {
      await expect(
        dopexStrategy.connect(deployer).deposit(userBalancer)
      ).to.revertedWithCustomError(
        dopexStrategy,
        `DopexStrategy_AmountAboveBalance`
      );
    });

    it("Should fail to deposit if contract is not approved", async function () {
      await expect(
        dopexStrategy.connect(owner).deposit(userBalancer)
      ).to.revertedWith("ds-math-sub-underflow");
    });

    it("Should fail if contract is not whitelisted", async function () {
      await dpxWethLp
        .connect(owner)
        .approve(dopexStrategy.address, bne(10, 35));

      await expect(
        dopexStrategy.connect(owner).deposit(userBalancer)
      ).to.revertedWith("Contract must be whitelisted");
    });

    it("Should deposit DPX/WETH token", async function () {
      expect(await dopexStrategy.s_timer()).to.equal(0);

      await deposit(
        dpxWethLp,
        dpxEthLpFarm,
        dopexStrategy,
        owner,
        admin,
        userBalancer
      );

      expect(await dopexStrategy.s_timer()).to.equal(
        (await getTimestamp()) + sevenDays
      );
    });
  });

  describe("runStrategy(uint _strikeIndex, uint _sushiSlippage, uint _curveSlippage, address _ssovAddress)", async () => {
    it("Should fail if caller is not owner", async function () {
      await deposit(
        dpxWethLp,
        dpxEthLpFarm,
        dopexStrategy,
        owner,
        admin,
        userBalancer
      );

      await expect(
        dopexStrategy
          .connect(admin)
          .runStrategy(0, 800, 800, addresses.btcWeeklyPuts)
      ).to.revertedWithCustomError(dopexStrategy, `DopexStrategy_NotOwner`);
    });
    it("Should fail if not up to a week", async function () {
      await deposit(
        dpxWethLp,
        dpxEthLpFarm,
        dopexStrategy,
        owner,
        admin,
        userBalancer
      );

      await expect(
        dopexStrategy
          .connect(deployer)
          .runStrategy(0, 800, 800, addresses.btcWeeklyPuts)
      ).to.revertedWithCustomError(dopexStrategy, `DopexStrategy_NotUpToAWeek`);
    });

    it("Should fail if epoch expired", async function () {
      await deposit(
        dpxWethLp,
        dpxEthLpFarm,
        dopexStrategy,
        owner,
        admin,
        userBalancer
      );

      await time.increase(sevenDays);

      await expect(
        dopexStrategy
          .connect(deployer)
          .runStrategy(0, 800, 800, addresses.btcWeeklyPuts)
      ).to.revertedWithCustomError(dopexStrategy, `DopexStrategy_EpochExpired`);
    });

    it("Should run strategy when SSOV total collateral is lower than contracts balance", async function () {
      await deposit(
        dpxWethLp,
        dpxEthLpFarm,
        dopexStrategy,
        owner,
        admin,
        userBalancer
      );

      // setting oracle mock data
      await dpxPutPriceOracleMock
        .connect(deployer)
        .setCollateralPrice(100928804);
      await dpxPutPriceOracleMock
        .connect(deployer)
        .setUnderlyingPrice(10000000000);

      await time.increase(sevenDays);
      let days = 6 * 24 * 60 * 60;
      let exp = (await getTimestamp()) + days;

      await dpxWeeklyPutsSsovV3
        .connect(deployer)
        .bootstrap(
          [15000000000, 13000000000, 11500000000, 10000000000],
          exp,
          "dpx"
        );

      await time.increase(fourDays);

      await dpxWeeklyPutsSsovV3
        .connect(deployer)
        .addToContractWhitelist(dopexStrategy.address);

      // using a mock contract to deposit into SSOV so main contract can purchase puts first and write puts
      MockSSOV = await ethers.getContractFactory("MockSSOV");
      mockSSOV = await MockSSOV.deploy();

      await dpxWeeklyPutsSsovV3
        .connect(deployer)
        .addToContractWhitelist(mockSSOV.address);

      twoPoolHolder = await impersonate(addresses.twoPoolHolder);
      await I2pool.connect(twoPoolHolder).transfer(
        mockSSOV.address,
        "227682646953807208607"
      );

      await mockSSOV
        .connect(deployer)
        .deposit(dpxWeeklyPutsSsovV3.address, 0, "227682646953807208607");

      const tx = await dopexStrategy
        .connect(deployer)
        .runStrategy(0, 800, 800, dpxWeeklyPutsSsovV3.address);

      receipt = await tx.wait();
      const lastEvent = receipt.events.length - 1;
      const event = receipt.events[lastEvent];

      console.log(`
        contractDpxBalanceBeforeTx: ${event.args[0]}, 
        contractUsdcBalanceBeforeTx: ${event.args[1]}, 
        contract2PoolBalanceBeforeTx: ${event.args[2]}, 
        amountUsedForPurchase: ${event.args[3]}, 
        purchasedOption: ${event.args[4]}, 
        writeAmount: ${event.args[5]}
      `);
    });

    it("Should run strategy when SSOV total collateral is higher than contracts balance", async function () {
      await deposit(
        dpxWethLp,
        dpxEthLpFarm,
        dopexStrategy,
        owner,
        admin,
        userBalancer
      );

      // setting oracle mock data
      await dpxPutPriceOracleMock
        .connect(deployer)
        .setCollateralPrice(100928804);
      await dpxPutPriceOracleMock
        .connect(deployer)
        .setUnderlyingPrice(10000000000);

      await time.increase(sevenDays);
      let days = 6 * 24 * 60 * 60;
      let exp = (await getTimestamp()) + days;

      await dpxWeeklyPutsSsovV3
        .connect(deployer)
        .bootstrap(
          [15000000000, 13000000000, 11500000000, 10000000000],
          exp,
          "dpx"
        );

      await time.increase(fourDays);

      await dpxWeeklyPutsSsovV3
        .connect(deployer)
        .addToContractWhitelist(dopexStrategy.address);

      // using a mock contract to deposit into SSOV so main contract can purchase puts first and write puts
      MockSSOV = await ethers.getContractFactory("MockSSOV");
      mockSSOV = await MockSSOV.deploy();

      await dpxWeeklyPutsSsovV3
        .connect(deployer)
        .addToContractWhitelist(mockSSOV.address);

      twoPoolHolder = await impersonate(addresses.twoPoolHolder);
      await I2pool.connect(twoPoolHolder).transfer(
        mockSSOV.address,
        "13375209179092108641293"
      );

      await mockSSOV
        .connect(deployer)
        .deposit(dpxWeeklyPutsSsovV3.address, 0, "13375209179092108641293");

      const tx = await dopexStrategy
        .connect(deployer)
        .runStrategy(0, 800, 800, dpxWeeklyPutsSsovV3.address);

      receipt = await tx.wait();
      const lastEvent = receipt.events.length - 1;
      const event = receipt.events[lastEvent];

      console.log(`
        contractDpxBalanceBeforeTx: ${event.args[0]}, 
        contractUsdcBalanceBeforeTx: ${event.args[1]}, 
        contract2PoolBalanceBeforeTx: ${event.args[2]}, 
        amountUsedForPurchase: ${event.args[3]}, 
        purchasedOption: ${event.args[4]}, 
        writeAmount: ${event.args[5]}
      `);
    });
  });
});

async function impersonate(address) {
  await impersonateAccount(address);
  const owner = await ethers.getSigner(address);
  return owner;
}

async function getTimestamp() {
  const blockNumBefore = await ethers.provider.getBlockNumber();
  const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  const timestampBefore = blockBefore.timestamp;
  return timestampBefore;
}

async function deposit(
  dpxWethLpContract,
  dpxEthLpFarmContract,
  dopexStrategy,
  owner,
  admin,
  userBalancer
) {
  await dpxWethLpContract
    .connect(owner)
    .approve(dopexStrategy.address, bne(10, 35));

  await dpxEthLpFarmContract
    .connect(admin)
    .addToContractWhitelist(dopexStrategy.address);

  await dopexStrategy.connect(owner).deposit(userBalancer);
}
