import { ethers, upgrades } from 'hardhat';
import { CONFIG, getContract } from './CONFIG';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`deployer=`, deployer.address);
  const csClaim = await getContract();

  const schedules = CONFIG.schedules.map((x) => ({
    ...x,
    endDate: x.date,
    period: '0',
  }));
  await csClaim.setSchedules(0, schedules as any).then((x) => x.wait());

  console.log(`CONFIG.schedules=`, await csClaim.getSchedules(0));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
