const hre = require("hardhat");
const addresses = require("../test/addresses");

async function main() {
  const DemoToken = await hre.ethers.getContractFactory("SampleTokenERC20");
  const demoToken = await DemoToken.deploy("Demo", "DM", 1000000000000);

  //deploying this on testnet means commenting out the approve interactions in the constructor as those address for mainnet

  const DopexStrategy = await hre.ethers.getContractFactory("DopexStrategy");
  const dopexStrategy = await DopexStrategy.deploy(
    demoToken.address,
    demoToken.address,
    demoToken.address,
    { gasLimit: 90000000 }
  );

  console.log("deployed to:", dopexStrategy.address, demoToken.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

//npx hardhat run --network arbitrum_testnet scripts/deploy.js
