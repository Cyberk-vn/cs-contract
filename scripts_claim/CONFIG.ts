import { parseEther, parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { DateTime } from 'luxon';
import { CSClaim } from '../typechain-types';

const test_config = {
  address: '0x6BA18638a106024c5377E5B3d107cB89dA2D126d',
  schedules: [
    {
      date: DateTime.fromISO('2024-01-24T14:53:05.017Z').toUnixInteger(),
      unlockPercent: parseEther('50'),
    },
    {
      date: DateTime.fromISO('2024-01-25T14:53:05.017Z').toUnixInteger(),
      unlockPercent: parseEther('70'),
    },
    {
      date: DateTime.fromISO('2024-01-26T14:53:05.017Z').toUnixInteger(),
      unlockPercent: parseEther('100'),
    },
  ],
  rewardTokenAddress: '0x1FA6283ec7fBb012407E7A5FC44a78B065b2a1cf', //busdf
  feePercentage: parseEther('10.5'),
  feeReceiverAddress: '0xE1aC94F3Ab954175963eB9e2f236D6ab6cd6c52E',
};

// const mainnet_config = {
//   address: '',
//   schedules: [],
//   rewardTokenAddress: '',
//   feePercentage: parseEther('0'),
//   feeReceiverAddress: '',
// };

export const CONFIG = test_config;

export const getContract = async () => {
  const CSClaim = await ethers.getContractFactory('CSClaim');

  const claim = CSClaim.attach(CONFIG.address);

  return claim as CSClaim;
};

export const getTokenContract = async () => {
  const Token = await ethers.getContractFactory('Token');

  const token = Token.attach(CONFIG.rewardTokenAddress);

  return token;
};
