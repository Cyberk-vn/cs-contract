// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import '@openzeppelin/contracts/access/Ownable.sol';

import './LinearVestingBase.sol';
import './IVesting.sol';

contract LinearVestingImp is LinearVestingBase, Ownable {
  function configVesting(
    uint256 _firstTime,
    uint256 _firstPercentage,
    uint256 _linearStart,
    uint256 _linearEnd,
    uint256 _linearPeriod
  ) external onlyOwner {
    _configVesting(_firstTime, _firstPercentage, _linearStart, _linearEnd, _linearPeriod);
  }
}
