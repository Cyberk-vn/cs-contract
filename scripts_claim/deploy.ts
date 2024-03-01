import { ethers, upgrades } from 'hardhat';
import { CONFIG } from './CONFIG';

async function main() {
  const [deployer] = await ethers.getSigners();

  const CSClaim = await ethers.getContractFactory('CSClaim');

  const invest = (await upgrades.deployProxy(
    CSClaim,
    [deployer.address, CONFIG.feeReceiverAddress, CONFIG.feePercentage, CONFIG.rewardTokenAddress],
    {
      initializer: 'initialize',
      kind: 'uups',
    },
  )) as any;

  console.log(`claim=`, invest.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
