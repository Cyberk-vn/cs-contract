import { ethers, upgrades } from 'hardhat';
import { getContract } from './CONFIG';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`deployer=`, deployer.address);
  const csinvest = await getContract();
  await csinvest.setMinAmount(ethers.utils.parseEther('10'), { gasLimit: '999999' }).then((x) => x.wait());

  console.log(`finished=`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
