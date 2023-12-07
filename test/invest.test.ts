import { ethers, upgrades } from 'hardhat';
import { expect } from 'chai';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { CSInvest, Token } from '../typechain-types';
import { BigNumber } from 'ethers';

let invest: CSInvest;
let token: Token;

let guest: SignerWithAddress;
let deployer: SignerWithAddress;
let admin: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;
let user3: SignerWithAddress;
let receiver: SignerWithAddress;

const MINT_AMOUNT = parseUnits('10', 18);

describe('CSInvest', function () {
  before(async function () {
    [guest, deployer, admin, user1, user2, user3, receiver] = await ethers.getSigners();
    const CSInvest = await ethers.getContractFactory('CSInvest');
    const Token = await ethers.getContractFactory('Token');

    token = (await Token.connect(deployer).deploy('USDT', 'USDT', 18)) as Token;
    invest = (await upgrades.deployProxy(CSInvest, [deployer.address, receiver.address, token.address], {
      initializer: 'initialize',
    })) as CSInvest;
  });

  it('Setup token', async function () {
    await Promise.all(
      [user1, user2, user3].map(async (user) => {
        await token.connect(deployer).transfer(user.address, parseEther('1000'));
        await token.connect(user).approve(invest.address, parseEther('1000'));
      }),
    );
  });

  it('Invalid amount', async function () {
    await expect(invest.connect(user1).contribute(0))
      .to.revertedWithCustomError(invest, 'InvalidContributedAmount')
      .withArgs(0);

    await expect(invest.connect(user1).contribute(parseEther('9')))
      .to.revertedWithCustomError(invest, 'InvalidContributedAmount')
      .withArgs(parseEther('9'));
  });

  it('Contribute', async function () {
    await expect(invest.connect(user1).contribute(parseEther('100')))
      .to.emit(invest, 'Contribution')
      .withArgs(user1.address, parseEther('100'))
      .changeTokenBalances(token, [user1, invest.address], [parseEther('-105'), parseEther('105')]);
    expect(await invest.getBuyers()).to.deep.equal([user1.address]);
    const [buyers, amounts] = await invest.getBuyerInfos();
    expect(buyers).to.deep.equal([user1.address]);
    expect(amounts).to.deep.equal([parseEther('100')]);
  });

  it('Contribute more', async function () {
    await expect(invest.connect(user1).contribute(parseEther('100')))
      .to.emit(invest, 'Contribution')
      .withArgs(user1.address, parseEther('100'))
      .changeTokenBalances(token, [user1, invest.address], [parseEther('-105'), parseEther('105')]);
    expect(await invest.getBuyers()).to.deep.equal([user1.address]);
    const [buyers, amounts] = await invest.getBuyerInfos();
    expect(buyers).to.deep.equal([user1.address]);
    expect(amounts).to.deep.equal([parseEther('200')]);
  });

  it('User2 contribute', async function () {
    await expect(invest.connect(user2).contribute(parseEther('100')))
      .to.emit(invest, 'Contribution')
      .withArgs(user2.address, parseEther('100'))
      .changeTokenBalances(token, [user2, invest.address], [parseEther('-105'), parseEther('105')]);
    expect(await invest.getBuyers()).to.deep.equal([user1.address, user2.address]);
    const [buyers, amounts] = await invest.getBuyerInfos();
    expect(buyers).to.deep.equal([user1.address, user2.address]);
    expect(amounts).to.deep.equal([parseEther('200'), parseEther('100')]);
  });

  it('Withdraw', async function () {
    await expect(invest.connect(deployer).withdraw()).changeTokenBalances(
      token,
      [invest, receiver],
      [parseEther('-315'), parseEther('315')],
    );
  });
});
