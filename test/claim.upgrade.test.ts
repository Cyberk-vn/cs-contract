import { ethers, upgrades } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { CSClaim, CSClaim_R2 } from '../typechain-types';

let feeReceiver: SignerWithAddress;
let deployer: SignerWithAddress;

describe('CSClaim upgrade', function () {
  it('upgrade to v2', async function () {
    const CSClaim = await ethers.getContractFactory('CSClaim');
    const CSClaimV2 = await ethers.getContractFactory('CSClaim_R2');

    [deployer, feeReceiver] = await ethers.getSigners();

    const instance = (await upgrades.deployProxy(CSClaim, [deployer.address, feeReceiver.address, '10'], {
      initializer: 'initialize',
    })) as CSClaim;
    const upgraded = (await upgrades.upgradeProxy(instance.address, CSClaimV2)) as CSClaim_R2;

    const feePercentage = await upgraded.feePercentage();
    expect(feePercentage).to.eq('10');
  });
});
