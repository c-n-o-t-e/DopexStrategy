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
    sevenDays,
    dpxWethLp,
    dpxEthLpFarm,
    userBalancer,
    DopexStrategy,
    dopexStrategy;

  beforeEach(async () => {
    await fork_network(17548140); // always get recent block number due to missing trie node error
    [deployer] = await ethers.getSigners();
    sevenDays = 7 * 24 * 60 * 60;

    DopexStrategy = await ethers.getContractFactory("DopexStrategy");
    dopexStrategy = await DopexStrategy.deploy(
      addresses.dpxEthLpFarm,
      addresses.sushiRouter,
      addresses.curvePool
    );

    dpxWethLp = await ethers.getContractAt(
      "IDpxEthLpFarm",
      addresses.dpxWethLp
    );

    dpxEthLpFarm = await ethers.getContractAt(
      "IDpxEthLpFarm",
      addresses.dpxEthLpFarm
    );

    btcWeeklyPuts = await ethers.getContractAt(
      "ISSOV",
      addresses.btcWeeklyPuts
    );

    owner = await impersonate(addresses.owner);
    admin = await impersonate(addresses.admin);
    userBalancer = await dpxWethLp.balanceOf(owner.address);
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

  describe("runStrategy(uint _strikeIndex, uint _sushiSlippage, uint _curveSlippage, uint _purchasePercent, address _ssovAddress)", async () => {
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
          .runStrategy(0, 800, 800, 800, addresses.btcWeeklyPuts)
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
          .runStrategy(0, 800, 800, 800, addresses.btcWeeklyPuts)
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
          .runStrategy(0, 800, 800, 800, addresses.btcWeeklyPuts)
      ).to.revertedWithCustomError(dopexStrategy, `DopexStrategy_EpochExpired`);
    });
  });

  it.skip("Should run strategy", async function () {
    await deposit(
      dpxWethLp,
      dpxEthLpFarm,
      dopexStrategy,
      owner,
      admin,
      userBalancer
    );

    await time.increase(sevenDays);
    await btcWeeklyPuts
      .connect(admin)
      .addToContractWhitelist(dopexStrategy.address);

    await dopexStrategy
      .connect(deployer)
      .runStrategy(0, 800, 800, 800, addresses.btcWeeklyPuts);
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
