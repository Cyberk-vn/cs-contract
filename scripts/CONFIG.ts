import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { DateTime } from 'luxon';

// const test_config = {
//   address: '0xC4A121cd2d2C1C5Ff405b8Ef8106608F349415d1',

//   // receiver: '0x0cF34128CF383eB709c36c16cDa59F3Ae99B8Fb1',
//   receiver: '0x9D992E869eecc454938C2Ac5590872c4752BF3B5', // acc deploy
//   token: '0x1FA6283ec7fBb012407E7A5FC44a78B065b2a1cf', // busdf
//   minAmount: parseUnits('2', 18), // usd
//   maxAmount: parseUnits('10', 18), // usd
//   totalRaise: parseUnits('50', 18), // usd
//   tax: parseUnits('5', 18), // 5%
//   endTime: DateTime.fromISO('2023-12-21T07:00:00.000Z').toUnixInteger(),
//   price: parseUnits('0.1', 18), // usd
// };

const mainnet_config = {
  address: '',

  // receiver: '0x0cF34128CF383eB709c36c16cDa59F3Ae99B8Fb1',
  receiver: '0x9D992E869eecc454938C2Ac5590872c4752BF3B5', // acc deploy
  // token: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT in eth - decimal 6
  token: '0x55d398326f99059fF775485246999027B3197955', // USDT in bsc - decimal 18
  minAmount: parseUnits('0.01', 18), // price in usd
  maxAmount: parseUnits('0.1', 18), // price in usd
  totalRaise: parseUnits('1', 18), // price in usd
  tax: parseUnits('5', 18), // 5%
  endTime: DateTime.fromISO('2023-12-21T07:00:00.000Z').toUnixInteger(),
  price: parseUnits('0.01', 18), // price in usd
};

export const CONFIG = mainnet_config;

export const getContract = async () => {
  const CSInvest = await ethers.getContractFactory('CSInvest');

  const plan = CSInvest.attach(CONFIG.address);

  return plan;
};
