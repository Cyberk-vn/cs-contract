import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomicfoundation/hardhat-chai-matchers';
import '@openzeppelin/hardhat-upgrades';

let pks = {
  testnet: [],
  mainnet: [],
};
try {
  pks = require('./.pks.js');
} catch (error) {
  console.log('error', error);
}

const settings = {
  optimizer: {
    enabled: true,
    runs: 999,
  },
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{ version: '0.8.19', settings }],
  },
  networks: {
    testnet: {
      url: 'https://data-seed-prebsc-1-s3.binance.org:8545',
      accounts: pks.testnet,
    },
    mainnet: {
      url: 'https://bsc-dataseed.binance.org/',
      accounts: pks.mainnet,
    },
    eth: {
      url: 'https://rpc.ankr.com/eth',
      accounts: pks.mainnet,
    },
  },
};

export default config;
