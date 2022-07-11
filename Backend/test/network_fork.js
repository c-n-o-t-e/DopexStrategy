const { network } = require("hardhat");
const { BigNumber } = require("ethers");

async function fork_network(blockNumber = 13377190) {
  /// Use mainnet fork as provider
  return network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: `https://arb1.arbitrum.io/rpc`,
          blockNumber: blockNumber,
        },
      },
    ],
  });
}

function bnn(number) {
  return BigNumber.from(number);
}

function bne(number, expo) {
  let bn = bnn(number);
  for (expo; expo > 0; expo--) bn = bn.mul(number);
  return bn;
}

module.exports = {
  fork_network,
  bne,
};
