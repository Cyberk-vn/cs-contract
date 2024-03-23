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
let poolOwner: SignerWithAddress;
let user1: SignerWithAddress;
let feeReceiver: SignerWithAddress;
let user3: SignerWithAddress;

const FEE_DECIMALS = 9;
const TOKEN_DECIMALS = 5;
let endTime = 0;
const TOKEN_AMOUNT = parseUnits('800', TOKEN_DECIMALS); // 800

let values = [];
let tree: any;

let proof1: string[] = [];
let proof3: string[] = [];

const DAY_IN_SECONDS = 24 * 60 * 60;

const currentUnixTime = Math.floor(Date.now() / 1000);

const test_claimMaximumDates3 = [
  {
    date: `${currentUnixTime + 1 * DAY_IN_SECONDS}`,
    endDate: `${currentUnixTime + 1 * DAY_IN_SECONDS}`,
    unlockPercent: parseUnits('50', 18),
    period: '0',
  },
  {
    date: `${currentUnixTime + 2 * DAY_IN_SECONDS}`,
    endDate: `${currentUnixTime + 2 * DAY_IN_SECONDS}`,
    unlockPercent: parseUnits('70', 18),
    period: '0',
  },
  {
    date: `${currentUnixTime + 3 * DAY_IN_SECONDS}`,
    endDate: `${currentUnixTime + 3 * DAY_IN_SECONDS}`,
    unlockPercent: parseUnits('80', 18),
    period: '0',
  },
  {
    date: `${currentUnixTime + 4 * DAY_IN_SECONDS}`,
    endDate: `${currentUnixTime + 4 * DAY_IN_SECONDS}`,
    unlockPercent: parseUnits('90', 18),
    period: '0',
  },
  {
    date: `${currentUnixTime + 5 * DAY_IN_SECONDS}`,
    endDate: `${currentUnixTime + 5 * DAY_IN_SECONDS}`,
    unlockPercent: parseUnits('100', 18),
    period: '0',
  },
  // [`${currentUnixTime + 2 * DAY_IN_SECONDS}`, `${currentUnixTime + 2 * DAY_IN_SECONDS}`, parseEther('70'), '0'],
  // [`${currentUnixTime + 3 * DAY_IN_SECONDS}`, `${currentUnixTime + 3 * DAY_IN_SECONDS}`, parseEther('80'), '0'],
  // [`${currentUnixTime + 4 * DAY_IN_SECONDS}`, `${currentUnixTime + 4 * DAY_IN_SECONDS}`, parseEther('90'), '0'],
  // [`${currentUnixTime + 5 * DAY_IN_SECONDS}`, `${currentUnixTime + 5 * DAY_IN_SECONDS}`, parseEther('100'), '0'],
];

describe('CSClaim', function () {
  before(async function () {
    [guest, deployer, admin, poolOwner, user1, feeReceiver, user3] = await ethers.getSigners();
    const CSClaim = await ethers.getContractFactory('CSClaim');
    const Token = await ethers.getContractFactory('Token');

    feeToken = (await Token.connect(deployer).deploy('USDT', 'USDT', FEE_DECIMALS)) as Token;
    token = (await Token.connect(deployer).deploy('IDO', 'IDO', TOKEN_DECIMALS)) as Token;

    endTime = (await time.latest()) + time.duration.days(1);
    csClaim = (await upgrades.deployProxy(CSClaim, [deployer.address, feeReceiver.address, '0'], {
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
    await token.transfer(poolOwner.address, parseUnits('10000', TOKEN_DECIMALS));

    expect(await token.balanceOf(poolOwner.address)).to.eq(parseUnits('10000', TOKEN_DECIMALS));
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

    await csClaim.connect(deployer).adminAdd(poolOwner.address, token.address, tree.root, parseEther('0'));
  });
  it('Fund', async function () {
    await token.connect(poolOwner).approve(csClaim.address, parseUnits('10000', TOKEN_DECIMALS));
    await csClaim.connect(poolOwner).fund(0, parseUnits('1000', TOKEN_DECIMALS));
  });
  it('add vesting', async function () {
    await csClaim.connect(deployer).setSchedules(0, test_claimMaximumDates3);
    // expect(await csClaim.connect(deployer).getMaxPercentage()).eq(BigNumber.from('0'));
    // await time.increaseTo(+test_claimMaximumDates1[0][1]);
    // expect(await csClaim.connect(deployer).getMaxPercentage()).eq(test_claimMaximumDates1[0][2]);
  });

  it('Claim', async function () {
    await expect(csClaim.connect(user1).claim(0, 0, TOKEN_AMOUNT, proof1)).revertedWith(/Not started yet/);

    await time.increaseTo(+test_claimMaximumDates3[0].date);

    // 50% => TOKEN_AMOUNT/2 => 400
    await expect(csClaim.connect(user1).claim(0, 0, TOKEN_AMOUNT, proof1)).changeTokenBalance(
      token,
      user1,
      parseUnits('400', TOKEN_DECIMALS),
    );

    // 70%
    await time.increaseTo(+test_claimMaximumDates3[1].date);
    let tx = csClaim.connect(user1).claim(0, 1, TOKEN_AMOUNT, proof1);
    await expect(tx).changeTokenBalance(token, user1, parseUnits('160', TOKEN_DECIMALS));
    const gas = (await tx.then((x) => x.wait())).gasUsed;
    console.log('Gas used:', gas.toString());

    // np when claim 0 again
    await expect(csClaim.connect(user1).claim(0, 0, TOKEN_AMOUNT, proof1)).changeTokenBalance(
      token,
      user1,
      parseUnits('0', TOKEN_DECIMALS),
    );

    // 100%
    await time.increaseTo(+`${currentUnixTime + 5 * DAY_IN_SECONDS}`);
    tx = csClaim.connect(user1).claim(0, 4, TOKEN_AMOUNT, proof1);
    await expect(tx).changeTokenBalance(token, user1, parseUnits('240', TOKEN_DECIMALS));

    // no more
    await time.increaseTo(+`${currentUnixTime + 10 * DAY_IN_SECONDS}`);
    tx = csClaim.connect(user1).claim(0, 4, TOKEN_AMOUNT, proof1);
    await expect(tx).changeTokenBalance(token, user1, parseUnits('0', TOKEN_DECIMALS));

    const pool = await csClaim.pools(0);
    expect(pool.claimedAmount).to.eq(TOKEN_AMOUNT);
  });

  it('Set fee', async () => {
    await csClaim.connect(deployer).setPoolFeePercentage(0, parseUnits('1', 18));
  });

  it('Should user 3 claim and lose fee percentage', async () => {
    await expect(csClaim.connect(user3).claim(0, 4, TOKEN_AMOUNT, proof3)).revertedWith(/Not enough fund/);
    await csClaim.connect(poolOwner).fund(0, parseUnits('600', TOKEN_DECIMALS));
    const feeReceiverBalance = await token.balanceOf(feeReceiver.address);

    // 100% - 1% fee => 99%
    await expect(csClaim.connect(user3).claim(0, 4, TOKEN_AMOUNT, proof3)).changeTokenBalance(
      token,
      user3,
      parseUnits('792', TOKEN_DECIMALS),
    );

    const afterBalance = await token.balanceOf(feeReceiver.address);
    expect(afterBalance).to.eq(feeReceiverBalance.add(parseUnits('8', TOKEN_DECIMALS)));
  });
  it('PoolOwner can not create pool', async () => {
    await expect(csClaim.connect(poolOwner).syncdicateAdd(token.address, tree.root)).to.be.revertedWith(
      /AccessControl/,
    );
  });
  it('Add syncdicate', async () => {
    await csClaim.connect(deployer).grantRole(await csClaim.SYNDICATE_ROLE(), poolOwner.address);
  });
  it('Pool2', async () => {
    const tx = csClaim.connect(poolOwner).syncdicateAdd(token.address, tree.root);
    await expect(tx).emit(csClaim, 'PoolCreated').withArgs(1, poolOwner.address, token.address);
  });
  it('Claim2', async () => {
    // first 10%, cliff 6M 1% every day
    const start = currentUnixTime + 300 * DAY_IN_SECONDS;
    const start2 = start + 6 * 30 * DAY_IN_SECONDS;
    const vestings = [
      {
        date: start,
        endDate: start,
        unlockPercent: parseEther('10'),
        period: '0',
      },
      {
        date: start2,
        endDate: start2 + 89 * DAY_IN_SECONDS, // 90 days
        unlockPercent: parseEther('100'),
        period: DAY_IN_SECONDS,
      },
    ];
    await csClaim.connect(poolOwner).setSchedules(1, vestings);
    await token.connect(poolOwner).approve(csClaim.address, parseUnits('10000', TOKEN_DECIMALS));
    await csClaim.connect(poolOwner).fund(1, parseUnits('1000', TOKEN_DECIMALS));

    await time.increaseTo(start);
    await expect(csClaim.connect(user1).claim(1, 0, TOKEN_AMOUNT, proof1)).changeTokenBalance(
      token,
      user1,
      parseUnits('80', TOKEN_DECIMALS),
    );
    await time.increaseTo(start2);
    await expect(csClaim.connect(user1).claim(1, 1, TOKEN_AMOUNT, proof1)).changeTokenBalance(
      token,
      user1,
      parseUnits('8', TOKEN_DECIMALS),
    );
    await time.increaseTo(start2 + 4 * DAY_IN_SECONDS);
    await expect(csClaim.connect(user1).claim(1, 1, TOKEN_AMOUNT, proof1)).changeTokenBalance(
      token,
      user1,
      parseUnits('32', TOKEN_DECIMALS),
    );
    await time.increaseTo(start2 + 300 * DAY_IN_SECONDS);
    await expect(csClaim.connect(user1).claim(1, 1, TOKEN_AMOUNT, proof1)).changeTokenBalance(
      token,
      user1,
      parseUnits('680', TOKEN_DECIMALS),
    );
  });
});
