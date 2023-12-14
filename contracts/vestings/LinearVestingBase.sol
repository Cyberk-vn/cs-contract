// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import './IVesting.sol';

abstract contract LinearVestingBase is IVesting {
  uint256 constant FULL_100 = 100e18;

  uint256 public firstTime;
  uint256 public firstPercentage;
  uint256 public linearStartTime;
  uint256 public linearEndTime;
  uint256 public linearPeriod;

  uint256 public maxPercentage;

  function getMaxPercentage() public view override returns (uint256) {
    return maxPercentage;
  }

  function invalidate() public override {
    if (block.timestamp < firstTime) return;

    uint256 linearTimes = 1 + (linearEndTime - linearStartTime) / linearPeriod;
    uint256 linearPeriodPercentage = (FULL_100 - firstPercentage) / linearTimes;

    uint256 _max = firstPercentage;
    if (block.timestamp >= linearStartTime) {
      _max += (1 + (block.timestamp - linearStartTime) / linearPeriod) * linearPeriodPercentage;
    }
    if (_max > FULL_100) {
      _max = FULL_100;
    }

    maxPercentage = _max;
  }

  function _configVesting(
    uint256 _firstTime,
    uint256 _firstPercentage,
    uint256 _linearStart,
    uint256 _linearEnd,
    uint256 _linearPeriod
  ) internal {
    firstTime = _firstTime;
    firstPercentage = _firstPercentage;
    linearStartTime = _linearStart;
    linearEndTime = _linearEnd;
    linearPeriod = _linearPeriod;
  }
}
