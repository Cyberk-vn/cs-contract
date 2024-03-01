import { ethers, upgrades } from 'hardhat';
import { CONFIG, getContract } from './CONFIG';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`deployer=`, deployer.address);
  const csClaim = await getContract();
  await csClaim.setReceiver(CONFIG.feeReceiverAddress, { gasLimit: '999999' }).then((x) => x.wait());

  console.log(`CONFIG.feeReceiverAddress=`, CONFIG.feeReceiverAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
