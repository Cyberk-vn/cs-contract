import { ethers, upgrades } from 'hardhat';
import { CONFIG, getContract, getTokenContract } from './CONFIG';

import csvToJson from 'csvtojson';
import * as path from 'path';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`deployer=`, deployer.address);
  const csClaim = await getContract();
  const token = await getTokenContract();
  const TOKEN_DECIMALS = await token.decimals();

  let whitelist: { address: string; amount: string }[] = [];
  await csvToJson()
    .fromFile(path.resolve(__dirname, 'whitelist.csv'), {})
    .then((jsonObj) => {
      console.log('-------- CSV --------');
      console.log(jsonObj);
      console.log('---------------------');
      whitelist.push(...(jsonObj as { address: string; amount: string }[]));
    });

  const treeValues = whitelist
    .filter((w) => !!w.address && !!w.amount)
    .map((w) => [w.address, parseUnits(w.amount, TOKEN_DECIMALS)]);
  console.log('---------- WHITELIST ----------');
  console.log(treeValues);

  const tree = StandardMerkleTree.of(treeValues, ['address', 'uint256']);

  await csClaim.setRoot(tree.root, { gasLimit: '999999' });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
