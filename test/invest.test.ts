import { ethers, upgrades } from 'hardhat';
import { expect } from 'chai';
import { formatUnits, parseEther, parseUnits } from 'ethers/lib/utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { CSInvest, Token } from '../typechain-types';
import { BigNumber } from 'ethers';
import { time } from '@nomicfoundation/hardhat-network-helpers';

let invest: CSInvest;
let feeToken: Token;
let token: Token;

let guest: SignerWithAddress;
let deployer: SignerWithAddress;
let admin: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;
let user3: SignerWithAddress;
let contributeReceiver: SignerWithAddress;
let receiver: SignerWithAddress;

const FEE_DECIMALS = 9;
const TOKEN_DECIMALS = 6;
const TOTAL_RAISE = parseUnits('500', FEE_DECIMALS);
const MIN_AMOUNT = parseUnits('10', FEE_DECIMALS);
const MAX_AMOUNT = parseUnits('250', FEE_DECIMALS);
let endTime = 0;
const price = parseUnits('0.5', FEE_DECIMALS);
const TOKEN_AMOUNT = parseUnits('800', TOKEN_DECIMALS); // 400 / 0.5
const TAX = parseUnits('5', 18);

describe('CSInvest', function () {
  before(async function () {
    [guest, deployer, admin, user1, user2, user3, receiver, contributeReceiver] = await ethers.getSigners();
    const CSInvest = await ethers.getContractFactory('CSInvest');
    const Token = await ethers.getContractFactory('Token');

    feeToken = (await Token.connect(deployer).deploy('USDT', 'USDT', FEE_DECIMALS)) as Token;
    token = (await Token.connect(deployer).deploy('IDO', 'IDO', TOKEN_DECIMALS)) as Token;

    endTime = (await time.latest()) + time.duration.days(1);
    invest = (await upgrades.deployProxy(
      CSInvest,
      [deployer.address, receiver.address, feeToken.address, TOTAL_RAISE, endTime, TAX, MIN_AMOUNT, MAX_AMOUNT, price],
      {
        initializer: 'initialize',
      },
    )) as CSInvest;

    invest.connect(deployer).grantRole(await invest.ADMIN_ROLE(), admin.address);
  });

  it('Setup token', async function () {
    await Promise.all(
      [user1, user2, user3].map(async (user) => {
        await feeToken.connect(deployer).transfer(user.address, parseUnits('1000'));
        await feeToken.connect(user).approve(invest.address, parseUnits('1000'));
      }),
    );
  });

  it('Invalid amount', async function () {
    await expect(invest.connect(user1).contribute(0))
      .to.revertedWithCustomError(invest, 'InvalidContributedAmount')
      .withArgs(0);

    await expect(invest.connect(user1).contribute(parseUnits('9', FEE_DECIMALS)))
      .to.revertedWithCustomError(invest, 'InvalidContributedAmount')
      .withArgs(parseUnits('9', FEE_DECIMALS));
  });

  it('Contribute', async function () {
    await expect(invest.connect(user1).contribute(parseUnits('100', FEE_DECIMALS)))
      .to.emit(invest, 'Contribution')
      .withArgs(user1.address, parseUnits('100', FEE_DECIMALS))
      .changeTokenBalances(
        feeToken,
        [user1, invest.address],
        [parseUnits('-105', FEE_DECIMALS), parseUnits('105', FEE_DECIMALS)],
      );
    expect(await invest.getBuyers()).to.deep.equal([user1.address]);
    const [buyers, amounts] = await invest.getBuyerAmounts();
    expect(buyers).to.deep.equal([user1.address]);
    expect(amounts).to.deep.equal([parseUnits('100', FEE_DECIMALS)]);
  });

  it('Contribute more', async function () {
    await expect(invest.connect(user1).contribute(parseUnits('100', FEE_DECIMALS)))
      .to.emit(invest, 'Contribution')
      .withArgs(user1.address, parseUnits('100', FEE_DECIMALS))
      .changeTokenBalances(
        feeToken,
        [user1, invest.address],
        [parseUnits('-105', FEE_DECIMALS), parseUnits('105', FEE_DECIMALS)],
      );
    expect(await invest.getBuyers()).to.deep.equal([user1.address]);
    const [buyers, amounts] = await invest.getBuyerAmounts();
    expect(buyers).to.deep.equal([user1.address]);
    expect(amounts).to.deep.equal([parseUnits('200', FEE_DECIMALS)]);
  });

  it('User2 contribute', async function () {
    await expect(invest.connect(user2).contribute(parseUnits('100', FEE_DECIMALS)))
      .to.emit(invest, 'Contribution')
      .withArgs(user2.address, parseUnits('100', FEE_DECIMALS))
      .changeTokenBalances(
        feeToken,
        [user2, invest.address],
        [parseUnits('-105', FEE_DECIMALS), parseUnits('105', FEE_DECIMALS)],
      );
    expect(await invest.getBuyers()).to.deep.equal([user1.address, user2.address]);
    const [buyers, amounts] = await invest.getBuyerAmounts();
    expect(buyers).to.deep.equal([user1.address, user2.address]);
    expect(amounts).to.deep.equal([parseUnits('200', FEE_DECIMALS), parseUnits('100', FEE_DECIMALS)]);

    const [allBuyers, infos] = await invest.getBuyerInfos();
    expect(allBuyers).to.deep.equal([user1.address, user2.address]);
    expect(infos[0].amount).to.equal(parseUnits('200', FEE_DECIMALS));
    expect(infos[1].amount).to.equal(parseUnits('100', FEE_DECIMALS));
  });

  it('contribute with receiver setted', async () => {
    await invest.connect(admin).setContributeReceiver(await contributeReceiver.getAddress());
    await expect(invest.connect(user2).contribute(parseUnits('100', FEE_DECIMALS)))
      .to.emit(invest, 'Contribution')
      .withArgs(user2.address, parseUnits('100', FEE_DECIMALS))
      .changeTokenBalances(
        feeToken,
        [user2, contributeReceiver.address],
        [parseUnits('-105', FEE_DECIMALS), parseUnits('105', FEE_DECIMALS)],
      );
  });

  it("User contribute over user's max amount", async function () {
    await expect(invest.connect(user1).contribute(parseUnits('100', FEE_DECIMALS))).to.revertedWithCustomError(
      invest,
      'OverMaxAmount',
    );
  });

  it('User contribute over total raise', async function () {
    await expect(invest.connect(user3).contribute(parseUnits('200', FEE_DECIMALS)))
      .to.revertedWithCustomError(invest, 'OverTotalRaise')
      .withArgs(parseUnits('400', FEE_DECIMALS), parseUnits('200', FEE_DECIMALS));
  });

  it('Withdraw', async function () {
    await expect(invest.connect(deployer).withdraw()).changeTokenBalances(
      feeToken,
      [invest, receiver],
      [parseUnits('-315', FEE_DECIMALS), parseUnits('315', FEE_DECIMALS)],
    );
  });

  it('Can not contribite after ended', async function () {
    await time.increaseTo(endTime + 1);
    await expect(invest.connect(user1).contribute(parseUnits('100'))).to.revertedWithCustomError(invest, 'Ended');
  });

  it('Setup linear vesting', async function () {
    const LinearVestingImp = await ethers.getContractFactory('LinearVestingImp');
    const linearVesting = await LinearVestingImp.deploy();

    // first day 10%
    // cliff 30 days and 30% each 30 days
    await linearVesting.configVesting(
      endTime + time.duration.days(1),
      parseUnits('10'),
      endTime + time.duration.days(30),
      endTime + time.duration.days(30) + 2 * time.duration.days(30),
      time.duration.days(30),
    );

    await invest.connect(deployer).setVesting(linearVesting.address);
    await invest.connect(deployer).setToken(token.address);
    await token.transfer(invest.address, TOKEN_AMOUNT);

    await expect(invest.connect(user1).claim(true)).changeTokenBalance(token, user1, 0);
    // user buy 200 USDT => 400 IDO

    // 10% => 40 IDO
    await time.increaseTo(endTime + time.duration.days(1));
    await expect(invest.connect(user1).claim(true)).changeTokenBalance(token, user1, parseUnits('40', TOKEN_DECIMALS));

    // mo more
    await expect(invest.connect(user1).claim(true)).changeTokenBalance(token, user1, 0);

    // 30% => 120 IDO
    await time.increaseTo(endTime + time.duration.days(30));
    await expect(invest.connect(user1).claim(true)).changeTokenBalance(token, user1, parseUnits('120', TOKEN_DECIMALS));

    // wait to end => 60% => 240 IDO
    await time.increaseTo(endTime + time.duration.days(100));
    await expect(invest.connect(user1).claim(true)).changeTokenBalance(token, user1, parseUnits('240', TOKEN_DECIMALS));
  });
});
