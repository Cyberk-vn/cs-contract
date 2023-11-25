import { ethers, upgrades } from 'hardhat';
import { expect } from 'chai';
import { parseEther } from 'ethers/lib/utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { CSPlan, Token } from '../typechain-types';

let plan: CSPlan;
let token: Token;

let guest: SignerWithAddress;
let deployer: SignerWithAddress;
let admin: SignerWithAddress;
let user1: SignerWithAddress;
let user2: SignerWithAddress;
let user3: SignerWithAddress;
let receiver: SignerWithAddress;

describe('CSPlan', function () {
  before(async function () {
    [guest, deployer, admin, user1, user2, user3, receiver] = await ethers.getSigners();
    const CSPlan = await ethers.getContractFactory('CSPlan');
    const Token = await ethers.getContractFactory('Token');

    token = (await Token.connect(deployer).deploy('USDT', 'USDT', 18)) as Token;
    plan = (await upgrades.deployProxy(CSPlan, [deployer.address, receiver.address, token.address], {
      initializer: 'initialize',
    })) as CSPlan;
  });

  it('Send token', async function () {
    await Promise.all(
      [user1, user2, user3].map(async (user) => {
        await token.connect(deployer).transfer(user.address, parseEther('1000'));
        await token.connect(user).approve(plan.address, parseEther('1000'));
      }),
    );
  });

  it('Set admin', async function () {
    await plan.connect(deployer).grantRole(await plan.ADMIN_ROLE(), admin.address);
  });

  it('SetFees', async function () {
    await expect(plan.setPlanFees([1], [parseEther('100')])).revertedWith(/AccessControl/);

    await plan.connect(admin).setPlanFees([1, 2], [parseEther('100'), parseEther('200')]);
  });

  it('Buy invalid plan', async function () {
    await expect(plan.connect(user1).buy(1, 0)).revertedWithCustomError(plan, 'InvalidPlanId').withArgs(0);
  });

  it('Buy plan', async function () {
    await expect(plan.connect(user1).buy(1, 1))
      .to.emit(plan, 'Payment')
      .withArgs(1, 1, user1.address, parseEther('100'))
      .changeTokenBalances(token, [user1, receiver], [parseEther('-100'), parseEther('100')]);
  });
});
