import { parseUnits } from 'ethers/lib/utils';

const test_config = {
  receiver: '0x0cF34128CF383eB709c36c16cDa59F3Ae99B8Fb1',
  token: '0x1FA6283ec7fBb012407E7A5FC44a78B065b2a1cf',
  minAmount: parseUnits('0', 18),
  totalRaise: parseUnits('30000', 18),
  tax: parseUnits('5', 18), // 5%
};

export const CONFIG = test_config;
