import { ethers, upgrades } from 'hardhat';
import { CONFIG } from './CONFIG';

async function main() {
  const [deployer] = await ethers.getSigners();

  const CSInvest = await ethers.getContractFactory('CSInvest');

  const invest = (await upgrades.deployProxy(
    CSInvest,
    [
      deployer.address,
      CONFIG.receiver,
      CONFIG.token,
      CONFIG.totalRaise,
      CONFIG.endTime,
      CONFIG.tax,
      CONFIG.minAmount,
      CONFIG.maxAmount,
      CONFIG.price,
    ],
    {
      initializer: 'initialize',
      kind: 'uups',
    },
  )) as any;

  console.log(`invest=`, invest.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
