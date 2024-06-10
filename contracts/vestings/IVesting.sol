// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

// Obsoleted, favor CSClaim
interface IVesting {
  error InvalidPercentage(uint256 percentage);

  function getMaxPercentage() external returns (uint256);

  function invalidate() external;
}
