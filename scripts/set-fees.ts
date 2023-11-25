import { ethers, upgrades } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  const CSPlan = await ethers.getContractFactory('CSPlan');

  const plan = CSPlan.attach('0x658C666c23A74b9d213ca0dcb7DF50f2cCF5e6CF');

  await plan
    .connect(deployer)
    .setPlanFees([1], [ethers.utils.parseEther('10')], { gasLimit: '999999' })
    .then((x) => x.wait());

  console.log(`Plan=`, await plan.planFees(1));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
