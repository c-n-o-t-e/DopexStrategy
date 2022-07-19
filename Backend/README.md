# DopexStrategy

Create `.env` file from `.env.example`

To test clone repo run
`npm i`
`npx hardhat test test/DopexStrategy.js`

# Note

Before running test get updated `blockNumber` from Arbitrum [scan](https://arbiscan.io/)
as fork Arbitrum mainnet has a bug with `missing trie node error` hence getting a recent `blockNumber` is paramount.
