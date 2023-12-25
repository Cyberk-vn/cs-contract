import { ethers, upgrades } from 'hardhat';
import { CONFIG, getContract } from './CONFIG';

async function main() {
  const [deployer] = await ethers.getSigners();

  const csinvest = await getContract();
  await csinvest.withdraw().then((x) => x.wait());

  console.log(`finished=`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
