import { ethers, upgrades } from 'hardhat';
import { CONFIG, getContract } from './CONFIG';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`deployer=`, deployer.address);

  const csClaim = await getContract();

  const ClaimR2 = await ethers.getContractFactory('CSClaim_R2');
  const upgrade = await upgrades.upgradeProxy(csClaim.address, ClaimR2);

  console.log('CsClaim upgraded to R2');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
