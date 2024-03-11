import { ethers, upgrades } from 'hardhat';
import { expect } from 'chai';
import { formatUnits, parseEther, parseUnits } from 'ethers/lib/utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { CSClaim, CSInvest, Token } from '../typechain-types';
import { BigNumber } from 'ethers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

let csClaim: CSClaim;
let feeToken: Token;
let token: Token;

let guest: SignerWithAddress;
let deployer: SignerWithAddress;
let admin: SignerWithAddress;
let user1: SignerWithAddress;
let feeReceiver: SignerWithAddress;
let user3: SignerWithAddress;

const FEE_DECIMALS = 9;
const TOKEN_DECIMALS = 5;
let endTime = 0;
const TOKEN_AMOUNT = parseUnits('800', TOKEN_DECIMALS); // 800

let values = [];
let tree;

let proof1: string[] = [];
let proof3: string[] = [];

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

describe('CSClaim', function () {
  before(async function () {
    [guest, deployer, admin, user1, feeReceiver, user3] = await ethers.getSigners();
    const CSClaim = await ethers.getContractFactory('CSClaim');
    const Token = await ethers.getContractFactory('Token');

    feeToken = (await Token.connect(deployer).deploy('USDT', 'USDT', FEE_DECIMALS)) as Token;
    token = (await Token.connect(deployer).deploy('IDO', 'IDO', TOKEN_DECIMALS)) as Token;

    endTime = (await time.latest()) + time.duration.days(1);
    csClaim = (await upgrades.deployProxy(CSClaim, [deployer.address, feeReceiver.address, '0', token.address], {
      initializer: 'initialize',
    })) as CSClaim;
  });

  it('Setup token', async function () {
    await Promise.all(
      [user1, feeReceiver, user3].map(async (user) => {
        await feeToken.connect(deployer).transfer(user.address, parseUnits('1000', FEE_DECIMALS));
        await feeToken.connect(user).approve(csClaim.address, parseUnits('1000', FEE_DECIMALS));
      }),
    );
    await token.transfer(csClaim.address, parseUnits('10000', TOKEN_DECIMALS));

    await expect(await token.balanceOf(csClaim.address)).to.eq(parseUnits('10000', TOKEN_DECIMALS));
  });

  it('Setup root', async () => {
    values = [
      [user1.address, TOKEN_AMOUNT],
      [user3.address, TOKEN_AMOUNT],
    ];

    tree = StandardMerkleTree.of(values, ['address', 'uint256']);

    for (const [i, v] of tree.entries()) {
      const proof = tree.getProof(i);
      if (v[0] === user1.address) {
        proof1 = proof;
      } else if (v[0] === user3.address) {
        proof3 = proof;
      }
    }

    await csClaim.connect(deployer).setRoot(tree.root);

    await expect(csClaim.connect(user1).claim(true, '2', proof1)).to.reverted;
  });

  it('Initial check', async function () {
    // await csClaim.connect(deployer).setToken(token.address);
    await token.transfer(csClaim.address, TOKEN_AMOUNT);

    expect(await csClaim.connect(deployer).getMaxPercentage()).eq(BigNumber.from('0'));
    await csClaim.connect(deployer).invalidate();
  });

  it('add vesting', async function () {
    await csClaim.connect(deployer).addSchedules(test_claimMaximumDates1 as any);
    expect(await csClaim.connect(deployer).getMaxPercentage()).eq(BigNumber.from('0'));
    await time.increaseTo(+test_claimMaximumDates1[0][1]);
    expect(await csClaim.connect(deployer).getMaxPercentage()).eq(test_claimMaximumDates1[0][2]);
  });

  it('add new ok', async function () {
    await csClaim.connect(deployer).addSchedules(test_claimMaximumDates2 as any);
  });
  it('add and update multiple', async function () {
    await csClaim.connect(deployer).addSchedules(test_claimMaximumDates3 as any);
  });
  it('invalidate', async function () {
    await csClaim.connect(deployer).invalidate();
    expect(await csClaim.connect(deployer).currentScheduleId()).eq(BigNumber.from('0'));
    expect(await csClaim.connect(deployer).getMaxPercentage()).eq(parseEther('50'));

    // 50% => TOKEN_AMOUNT/2 => 400
    await expect(csClaim.connect(user1).claim(true, TOKEN_AMOUNT, proof1)).changeTokenBalance(
      token,
      user1,
      parseUnits('400', TOKEN_DECIMALS),
    );

    await time.increaseTo(+test_claimMaximumDates3[0][1]);
    await csClaim.connect(deployer).invalidate();
    expect(await csClaim.connect(deployer).currentScheduleId()).eq(BigNumber.from('1'));
    expect(await csClaim.connect(deployer).getMaxPercentage()).eq(parseEther('70'));
    // 70-50 => 20% => 160
    await expect(csClaim.connect(user1).claim(true, TOKEN_AMOUNT, proof1)).changeTokenBalance(
      token,
      user1,
      parseUnits('160', TOKEN_DECIMALS),
    );

    await time.increaseTo(+`${currentUnixTime + 4.5 * DAY_IN_SECONDS}`);
    await csClaim.connect(deployer).invalidate();
    expect(await csClaim.connect(deployer).currentScheduleId()).eq(BigNumber.from('3'));
    expect(await csClaim.connect(deployer).getMaxPercentage()).eq(parseEther('90'));
    // 90 - 70 => 20% => 160
    await expect(csClaim.connect(user1).claim(true, TOKEN_AMOUNT, proof1)).changeTokenBalance(
      token,
      user1,
      parseUnits('160', TOKEN_DECIMALS),
    );

    await time.increaseTo(+`${currentUnixTime + 5 * DAY_IN_SECONDS}`);
    await csClaim.connect(deployer).invalidate();
    expect(await csClaim.connect(deployer).currentScheduleId()).eq(BigNumber.from('4'));
    expect(await csClaim.connect(deployer).getMaxPercentage()).eq(parseEther('100'));
    // 10%
    await expect(csClaim.connect(user1).claim(true, TOKEN_AMOUNT, proof1)).changeTokenBalance(
      token,
      user1,
      parseUnits('80', TOKEN_DECIMALS),
    );

    await time.increaseTo(+`${currentUnixTime + 10 * DAY_IN_SECONDS}`);
    await csClaim.connect(deployer).invalidate();
    expect(await csClaim.connect(deployer).currentScheduleId()).eq(BigNumber.from('4'));
    expect(await csClaim.connect(deployer).getMaxPercentage()).eq(parseEther('100'));
    // 0%
    await expect(csClaim.connect(user1).claim(true, TOKEN_AMOUNT, proof1)).changeTokenBalance(token, user1, '0');
  });

  it('Set fee', async () => {
    await csClaim.connect(deployer).setFeePercentage(parseEther('1'));
  });

  it('Should user 3 claim and lose fee percentage', async () => {
    const feeReceiverBalance = await token.balanceOf(feeReceiver.address);

    // 100% - 10% fee => 90%
    await expect(csClaim.connect(user3).claim(true, TOKEN_AMOUNT, proof3)).changeTokenBalance(
      token,
      user3,
      parseUnits('792', TOKEN_DECIMALS),
    );

    const afterBalance = await token.balanceOf(feeReceiver.address);
    await expect(afterBalance).to.eq(feeReceiverBalance.add(parseUnits('8', TOKEN_DECIMALS)));
  });
});
