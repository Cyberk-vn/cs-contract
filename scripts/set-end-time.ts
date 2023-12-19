import { ethers, upgrades } from 'hardhat';
import { CONFIG, getContract } from './CONFIG';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`deployer=`, deployer.address);
  const csinvest = await getContract();
  await csinvest.setEndTime(CONFIG.endTime).then((x) => x.wait());

  console.log(`CONFIG.endTime=`, CONFIG.endTime);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
