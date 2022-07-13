require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.9",
  mocha: {
    timeout: 100000000,
  },
  networks: {
    hardhat: {
      saveDeployments: false,
    },
    arbitrum_testnet: {
      url: "https://rinkeby.arbitrum.io/rpc",
      network_id: 421611,
      accounts: [process.env.privateKey],
    },
  },
  etherscan: {
    apiKey: process.env.apiKey,
  },
};
