// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import './IVesting.sol';

abstract contract ScheduleVestingBase is IVesting {
  struct Schedule {
    uint256 id;
    uint256 date;
    uint256 percentage;
  }

  Schedule[] public schedules;
  uint256 public currentScheduleId;

  function getMaxPercentage() public view override returns (uint256) {
    if (schedules.length == 0) return 0;
    Schedule memory schedule = schedules[currentScheduleId];
    if (schedule.date <= block.timestamp) {
      return schedule.percentage;
    } else {
      return 0;
    }
  }

  function invalidate() public override {
    if (schedules.length > 0 && currentScheduleId < schedules.length - 1) {
      Schedule memory nextSchedule = schedules[currentScheduleId + 1];
      if (nextSchedule.date <= block.timestamp) {
        currentScheduleId = currentScheduleId + 1;
        // watch
        invalidate();
      }
    }
  }

  function getScheduleLength() external view returns (uint256) {
    return schedules.length;
  }

  function getSchedules() external view returns (Schedule[] memory) {
    return schedules;
  }

  function _addSchedules(Schedule[] calldata _schedules) internal {
    for (uint256 i = 0; i < _schedules.length; i++) {
      Schedule memory newConfig = _schedules[i];
      require(newConfig.percentage <= 100e18, 'invalid percentage');
      if (newConfig.id < schedules.length) {
        // update
        schedules[newConfig.id].percentage = newConfig.percentage;
        schedules[newConfig.id].date = newConfig.date;
      } else {
        require(newConfig.id == schedules.length, 'invalid id');
        // add new
        schedules.push(newConfig);
      }
    }
  }
}
