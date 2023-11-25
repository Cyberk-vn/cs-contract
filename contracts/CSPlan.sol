// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {CountersUpgradeable} from '@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol';
import {ReentrancyGuardUpgradeable} from '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import {AccessControlUpgradeable} from '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';

import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import {UUPSUpgradeable} from '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract CSPlan is AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');

  ERC20 public feeToken;
  address public receiver;

  mapping(uint256 => uint256) public planFees;
  mapping(uint256 => mapping(uint256 => PaymentInfo)) public paymentInfos;

  struct PaymentInfo {
    address payer;
    uint256 at;
    uint256 amount;
  }

  event Payment(uint256 indexed userId, uint256 indexed planId, address indexed payer, uint256 amount);

  error InvalidPlanId(uint256 planId);

  function initialize(address _owner, address _receiver, ERC20 _feeToken) public initializer {
    __UUPSUpgradeable_init();
    __AccessControl_init();
    __Pausable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, _owner);
    _grantRole(ADMIN_ROLE, _owner);
    receiver = _receiver;
    feeToken = _feeToken;
  }

  function buy(uint256 userId, uint256 planId) external whenNotPaused {
    if (planFees[planId] == 0) revert InvalidPlanId(planId);

    uint256 fee = planFees[planId];
    feeToken.transferFrom(msg.sender, receiver, fee);

    PaymentInfo storage info = paymentInfos[userId][planId];
    info.payer = msg.sender;
    info.at = block.timestamp;
    info.amount = fee;

    emit Payment(userId, planId, msg.sender, fee);
  }

  function setPlanFees(uint256[] memory planIds, uint256[] memory fees) external onlyRole(ADMIN_ROLE) {
    for (uint256 i = 0; i < planIds.length; i++) {
      planFees[planIds[i]] = fees[i];
    }
  }

  function pause() external onlyRole(ADMIN_ROLE) {
    _pause();
  }

  function unpause() external onlyRole(ADMIN_ROLE) {
    _unpause();
  }

  function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
