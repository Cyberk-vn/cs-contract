// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {UUPSUpgradeable} from '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';

import {AccessControlUpgradeable} from '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import {IERC20Metadata} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import {IVesting} from './vestings/IVesting.sol';

import 'hardhat/console.sol';

contract CSInvest is AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
  uint256 constant FULL_100 = 100e18;

  IERC20Metadata public feeToken;
  IERC20Metadata public token;
  IVesting public vesting;

  address public receiver;

  uint256 public endTime;

  uint256 public totalRaise;
  uint256 public totalContributed;
  uint256 public taxPercentage;
  uint256 public minAmount;
  uint256 public maxAmount;
  uint256 public price;

  address[] public buyers;

  mapping(address => BuyerInfo) public buyerInfos;

  /**
   * Convert to token when claim
   */
  struct BuyerInfo {
    uint256 amount; // fee token amount
    uint256 claimedAmount; // fee token amount
  }

  address private contributeReceiver;

  event Contributed(address indexed buyer, uint256 amount);
  event Claimed(address indexed buyer, uint256 amount, uint256 tokenAmount);

  error InvalidContributedAmount(uint256 amount);
  error OverMaxAmount();
  error OverTotalRaise(uint256 contributedAmount, uint256 amount);
  error Ended();

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    address _owner,
    address _receiver,
    IERC20Metadata _feeToken,
    uint256 _totalRaise,
    uint256 _endTime,
    uint256 _tax,
    uint256 _minAmount,
    uint256 _maxAmount,
    uint256 _price
  ) public initializer {
    __UUPSUpgradeable_init();
    __AccessControl_init();
    __Pausable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, _owner);
    _grantRole(ADMIN_ROLE, _owner);

    feeToken = _feeToken;
    receiver = _receiver;

    totalRaise = _totalRaise;
    minAmount = _minAmount;
    maxAmount = _maxAmount;
    taxPercentage = _tax;
    price = _price;
    endTime = _endTime;

    contributeReceiver = address(this);
  }

  function contribute(uint256 amount) external whenNotPaused {
    if (block.timestamp > endTime) revert Ended();
    if (amount == 0) revert InvalidContributedAmount(amount);

    uint256 total = totalContributed + amount;
    if (total > totalRaise) revert OverTotalRaise(totalContributed, amount);

    uint256 taxAmount;
    unchecked {
      taxAmount = (amount * taxPercentage) / FULL_100;
    }

    feeToken.transferFrom(msg.sender, contributeReceiver, amount + taxAmount);

    BuyerInfo storage buyerInfo = buyerInfos[msg.sender];
    if (buyerInfo.amount + amount > maxAmount) revert OverMaxAmount();
    if (buyerInfo.amount == 0) {
      buyers.push(msg.sender);
    }
    unchecked {
      buyerInfo.amount += amount;
      totalContributed += amount;
    }

    if (buyerInfo.amount < minAmount) {
      revert InvalidContributedAmount(buyerInfo.amount);
    }

    emit Contributed(msg.sender, amount);
  }

  // obsolete
  function claim(bool _invalidate) external whenNotPaused {
    if (_invalidate) {
      vesting.invalidate();
    }

    BuyerInfo storage buyerInfo = buyerInfos[msg.sender];
    uint256 _maxPercentage = vesting.getMaxPercentage();
    if (_maxPercentage > FULL_100) {
      revert IVesting.InvalidPercentage(_maxPercentage);
    }

    uint256 _maxClaim = (buyerInfo.amount * _maxPercentage) / FULL_100;
    uint256 _claimableAmount = _maxClaim - buyerInfo.claimedAmount;

    buyerInfo.claimedAmount = _maxClaim;

    uint256 _claimableTokenAmount = (_claimableAmount * 10 ** token.decimals()) / price;
    if (_claimableAmount > 0) {
      token.transfer(msg.sender, _claimableTokenAmount);
      emit Claimed(msg.sender, _claimableAmount, _claimableTokenAmount);
    }
  }

  // GETTERS
  function getBuyersLength() external view returns (uint256) {
    return buyers.length;
  }

  function getBuyers() external view returns (address[] memory) {
    return buyers;
  }

  function getBuyerAmounts() external view returns (address[] memory _buyers, uint256[] memory _amounts) {
    _buyers = buyers;
    _amounts = new uint256[](buyers.length);
    for (uint256 i = 0; i < buyers.length; ) {
      _amounts[i] = buyerInfos[buyers[i]].amount;
      unchecked {
        i++;
      }
    }
  }

  function getBuyerInfos() external view returns (address[] memory _buyers, BuyerInfo[] memory _infos) {
    _buyers = buyers;
    _infos = new BuyerInfo[](buyers.length);
    for (uint256 i = 0; i < buyers.length; ) {
      _infos[i] = buyerInfos[buyers[i]];
      unchecked {
        i++;
      }
    }
  }

  /// ADMIN FUNCTIONS
  function withdraw() external onlyRole(ADMIN_ROLE) {
    uint256 balance = feeToken.balanceOf(address(this));
    feeToken.transfer(receiver, balance);
  }

  function setContributeReceiver(address _contributeReceiver) external onlyRole(ADMIN_ROLE) {
    contributeReceiver = _contributeReceiver;
  }

  function setReceiver(address _receiver) external onlyRole(ADMIN_ROLE) {
    receiver = _receiver;
  }

  function setTotalRaise(uint256 _value) external onlyRole(ADMIN_ROLE) {
    totalRaise = _value;
  }

  function setPrice(uint256 _value) external onlyRole(ADMIN_ROLE) {
    price = _value;
  }

  function setVesting(IVesting _value) external onlyRole(ADMIN_ROLE) {
    vesting = _value;
  }

  function setToken(IERC20Metadata _value) external onlyRole(ADMIN_ROLE) {
    token = _value;
  }

  function setMinAmount(uint256 _value) external onlyRole(ADMIN_ROLE) {
    minAmount = _value;
  }

  function setMaxAmount(uint256 _value) external onlyRole(ADMIN_ROLE) {
    maxAmount = _value;
  }

  function setEndTime(uint256 _value) external onlyRole(ADMIN_ROLE) {
    endTime = _value;
  }

  function setTax(uint256 _tax) external onlyRole(ADMIN_ROLE) {
    taxPercentage = _tax;
  }

  function pause() external onlyRole(ADMIN_ROLE) {
    _pause();
  }

  function unpause() external onlyRole(ADMIN_ROLE) {
    _unpause();
  }

  function removeToken(IERC20Metadata _token) external onlyRole(ADMIN_ROLE) {
    uint256 balance = _token.balanceOf(address(this));
    _token.transfer(msg.sender, balance);
  }

  function _authorizeUpgrade(address) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
