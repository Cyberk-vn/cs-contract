// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {UUPSUpgradeable} from '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';

import {AccessControlUpgradeable} from '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import {IERC20Metadata} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import {ScheduleVestingBase} from './vestings/ScheduleVestingBase.sol';
import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';

contract CSClaim is AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable, ScheduleVestingBase {
  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
  uint256 constant FULL_100 = 100e18;

  IERC20Metadata public token;
  bytes32 private root;

  address public receiver; // Address will receive fee amount
  uint public feePercentage; // Xe18

  mapping(address => ClaimerInfo) public claimerInfos;

  struct ClaimerInfo {
    uint256 feeAmount; // fee amount
    uint256 claimedAmount; // received token amount
  }

  event Claimed(address indexed claimer, uint256 tokenAmount, uint256 feeAmount);

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address _owner, address _receiver, uint _feePercentage, IERC20Metadata _token) public initializer {
    __UUPSUpgradeable_init();
    __AccessControl_init();
    __Pausable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, _owner);
    _grantRole(ADMIN_ROLE, _owner);

    receiver = _receiver;
    feePercentage = _feePercentage;
    token = _token;
  }

  function verify(bytes32[] memory proof, address addr, uint256 amount) public view {
    bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(addr, amount))));
    require(MerkleProof.verify(proof, root, leaf), 'Invalid proof');
  }

  function claim(bool _invalidate, uint256 _totalAmount, bytes32[] memory _proof) external whenNotPaused {
    verify(_proof, msg.sender, _totalAmount);

    if (_invalidate) {
      invalidate();
    }

    uint256 _maxPercentage = getMaxPercentage();
    if (_maxPercentage > FULL_100) {
      revert InvalidPercentage(_maxPercentage);
    }

    ClaimerInfo storage claimerInfo = claimerInfos[msg.sender];

    uint256 _claimedAmount = claimerInfo.claimedAmount;
    uint256 _maxClaim = (_totalAmount * _maxPercentage) / FULL_100;
    uint256 _feeAmount = ((_maxClaim - _claimedAmount) * feePercentage) / FULL_100;
    uint256 _claimableAmount = _maxClaim - _claimedAmount - _feeAmount;

    claimerInfo.claimedAmount = _maxClaim;

    if (_claimableAmount > 0) {
      claimerInfo.feeAmount += _feeAmount;

      if(_feeAmount > 0) {
        token.transfer(receiver, _feeAmount); // Transfer fee
      }
      token.transfer(msg.sender, _claimableAmount); // Transfer tokens

      emit Claimed(msg.sender, _claimableAmount, _feeAmount);
    }
  }

  // GETTERS

  /// ADMIN FUNCTIONS
  function addSchedules(Schedule[] calldata _schedules) external onlyRole(ADMIN_ROLE) {
    _addSchedules(_schedules);
  }

  function setRoot(bytes32 _root) external onlyRole(ADMIN_ROLE) {
    root = _root;
  }

  function setToken(IERC20Metadata _value) external onlyRole(ADMIN_ROLE) {
    token = _value;
  }

  function setReceiver(address _receiver) external onlyRole(DEFAULT_ADMIN_ROLE) {
    receiver = _receiver;
  }

  function setFeePercentage(uint _feePercentage) external onlyRole(DEFAULT_ADMIN_ROLE) {
    feePercentage = _feePercentage;
  }

  function pause() external onlyRole(ADMIN_ROLE) {
    _pause();
  }

  function unpause() external onlyRole(ADMIN_ROLE) {
    _unpause();
  }

  function removeToken(IERC20Metadata _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
    uint256 balance = _token.balanceOf(address(this));
    _token.transfer(msg.sender, balance);
  }

  function _authorizeUpgrade(address) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
