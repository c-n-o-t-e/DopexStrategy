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
      accounts: [
        "0xbf24ac873f8118ac8344c4ed01d169accabb2893642ce62de949be7918ad17c1",
      ],
    },
  },
  etherscan: {
    apiKey: "7YNIM4192HFF7NXSK1SWWBIN3ZI2EYAQCK",
  },
};
