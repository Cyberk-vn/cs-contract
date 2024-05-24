import { ethers, upgrades } from 'hardhat';
import { CONFIG, getContract } from './CONFIG';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`deployer=`, deployer.address);
  const csClaim = await getContract();
  await csClaim.grantRole(await csClaim.SYNDICATE_ROLE(), CONFIG.syndicateLead).then((x) => x.wait());
  await csClaim.hasRole(await csClaim.SYNDICATE_ROLE(), CONFIG.syndicateLead).then((x) => console.log(`hasRole=`, x));
  console.log(`CONFIG.syndicateAdmin=`, CONFIG.syndicateLead);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
