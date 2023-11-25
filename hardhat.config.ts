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
  pks = require('./.pks').pks;
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
  },
};

export default config;
