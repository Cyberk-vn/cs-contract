import { ethers, upgrades } from 'hardhat';
import { CONFIG, getContract } from './CONFIG';
import { parseEther } from 'ethers/lib/utils';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`deployer=`, deployer.address);
  const csClaim = await getContract();
  await csClaim.setFeePercentage(CONFIG.feePercentage, { gasLimit: '999999' }).then((x) => x.wait());

  console.log(`CONFIG.feePercentage=`, CONFIG.feePercentage);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
