import { ethers, upgrades } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  const CSPlan = await ethers.getContractFactory('CSPlan');

  const testnetToken = '0x1FA6283ec7fBb012407E7A5FC44a78B065b2a1cf';

  const plan = (await upgrades.deployProxy(CSPlan, [deployer.address, deployer.address, testnetToken], {
    initializer: 'initialize',
    kind: 'uups',
  })) as any;

  console.log(`plan=`, plan.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
