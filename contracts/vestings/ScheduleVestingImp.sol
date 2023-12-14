// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import '@openzeppelin/contracts/access/Ownable.sol';

import './ScheduleVestingBase.sol';
import './IVesting.sol';

contract ScheduleVestingImp is ScheduleVestingBase, Ownable {
  function addSchedules(Schedule[] calldata _schedules) external onlyOwner {
    _addSchedules(_schedules);
  }
}
