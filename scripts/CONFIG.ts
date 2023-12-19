import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { DateTime } from 'luxon';

const test_config = {
  address: '0x5990190Ce672B88465fFA49AD54088E97A009B02',

  receiver: '0x0cF34128CF383eB709c36c16cDa59F3Ae99B8Fb1',
  token: '0x1FA6283ec7fBb012407E7A5FC44a78B065b2a1cf',
  minAmount: parseUnits('0', 18),
  totalRaise: parseUnits('30000', 18),
  tax: parseUnits('5', 18), // 5%
  endTime: DateTime.fromISO('2023-12-20T07:00:00.000Z').toUnixInteger(),
  price: parseUnits('0.05333', 18),
};

export const CONFIG = test_config;

export const getContract = async () => {
  const CSInvest = await ethers.getContractFactory('CSInvest');

  const plan = CSInvest.attach(test_config.address);

  return plan;
};
