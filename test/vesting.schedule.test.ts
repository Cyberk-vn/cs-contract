import { ethers, upgrades } from 'hardhat';
import { expect } from 'chai';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { CSInvest, ScheduleVestingImp, Token } from '../typechain-types';
import { BigNumber, utils } from 'ethers';
import { time } from '@nomicfoundation/hardhat-network-helpers';

let invest: CSInvest;
let token: Token;

let guest: SignerWithAddress;
let deployer: SignerWithAddress;
let admin: SignerWithAddress;
let owner1: SignerWithAddress;
let owner2: SignerWithAddress;
let owner3: SignerWithAddress;
let owner4: SignerWithAddress;
let owner5: SignerWithAddress;
let otherOwners: SignerWithAddress[];

const DAY_IN_SECONDS = 24 * 60 * 60;

const currentUnixTime = Math.floor(Date.now() / 1000);

const test_claimMaximumDates1 = [['0', `${currentUnixTime + 1 * DAY_IN_SECONDS}`, parseEther('50')]];
const test_claimMaximumDates2 = [['1', `${currentUnixTime + 2 * DAY_IN_SECONDS}`, parseEther('60')]];
const test_claimMaximumDates3 = [
  ['1', `${currentUnixTime + 2 * DAY_IN_SECONDS}`, parseEther('70')],
  ['2', `${currentUnixTime + 3 * DAY_IN_SECONDS}`, parseEther('80')],
  ['3', `${currentUnixTime + 4 * DAY_IN_SECONDS}`, parseEther('90')],
  ['4', `${currentUnixTime + 5 * DAY_IN_SECONDS}`, parseEther('100')],
];

let scheduleVesting: ScheduleVestingImp;

describe('Vesting', function () {
  this.timeout(100000);
  it('Setup', async function () {
    [deployer, owner1, owner2, owner3, owner4, owner5, ...otherOwners] = await ethers.getSigners();
  });
  it('Deploy', async function () {
    const ScheduleVestingImp = await ethers.getContractFactory('ScheduleVestingImp');

    scheduleVesting = await ScheduleVestingImp.deploy();
    await scheduleVesting.deployed();
  });
  it('Initial check', async function () {
    expect(await scheduleVesting.getMaxPercentage()).eq(BigNumber.from('0'));
    await scheduleVesting.invalidate();
  });
  it('add vesting', async function () {
    await scheduleVesting.addSchedules(test_claimMaximumDates1 as any);
    expect(await scheduleVesting.getMaxPercentage()).eq(BigNumber.from('0'));
    await time.increaseTo(+test_claimMaximumDates1[0][1]);
    expect(await scheduleVesting.getMaxPercentage()).eq(test_claimMaximumDates1[0][2]);
  });
  it('err case', async function () {
    await expect(
      scheduleVesting.addSchedules([['0', `${currentUnixTime + 1 * DAY_IN_SECONDS}`, parseEther('101')]] as any),
    ).rejectedWith('invalid percentage');
    await expect(
      scheduleVesting.addSchedules([['2', `${currentUnixTime + 1 * DAY_IN_SECONDS}`, parseEther('100')]] as any),
    ).rejectedWith('invalid id');
  });
  it('add new ok', async function () {
    await scheduleVesting.addSchedules(test_claimMaximumDates2 as any);
  });
  it('add and update multiple', async function () {
    await scheduleVesting.addSchedules(test_claimMaximumDates3 as any);
  });
  it('invalidate', async function () {
    await scheduleVesting.invalidate();
    expect(await scheduleVesting.currentScheduleId()).eq(BigNumber.from('0'));
    expect(await scheduleVesting.getMaxPercentage()).eq(parseEther('50'));

    await time.increaseTo(+test_claimMaximumDates3[0][1]);
    await scheduleVesting.invalidate();
    expect(await scheduleVesting.currentScheduleId()).eq(BigNumber.from('1'));
    expect(await scheduleVesting.getMaxPercentage()).eq(parseEther('70'));

    await time.increaseTo(+`${currentUnixTime + 4.5 * DAY_IN_SECONDS}`);
    await scheduleVesting.invalidate();
    expect(await scheduleVesting.currentScheduleId()).eq(BigNumber.from('3'));
    expect(await scheduleVesting.getMaxPercentage()).eq(parseEther('90'));

    await time.increaseTo(+`${currentUnixTime + 5 * DAY_IN_SECONDS}`);
    await scheduleVesting.invalidate();
    expect(await scheduleVesting.currentScheduleId()).eq(BigNumber.from('4'));
    expect(await scheduleVesting.getMaxPercentage()).eq(parseEther('100'));

    await time.increaseTo(+`${currentUnixTime + 10 * DAY_IN_SECONDS}`);
    await scheduleVesting.invalidate();
    expect(await scheduleVesting.currentScheduleId()).eq(BigNumber.from('4'));
    expect(await scheduleVesting.getMaxPercentage()).eq(parseEther('100'));
  });
});
