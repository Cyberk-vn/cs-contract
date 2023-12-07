// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {UUPSUpgradeable} from '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';

import {AccessControlUpgradeable} from '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import {IERC20Metadata} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';

contract CSInvest is AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');

  IERC20Metadata public feeToken;
  address public receiver;

  uint256 public minAmount;
  uint256 public tax;

  uint256 public totalContributed;
  address[] public buyers;

  mapping(address => BuyerInfo) public buyerInfos;

  struct BuyerInfo {
    uint256 amount;
  }

  event Contributed(address indexed buyer, uint256 amount);

  error InvalidContributedAmount(uint256 amount);

  function initialize(address _owner, address _receiver, IERC20Metadata _feeToken) public initializer {
    __UUPSUpgradeable_init();
    __AccessControl_init();
    __Pausable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, _owner);
    _grantRole(ADMIN_ROLE, _owner);

    feeToken = _feeToken;
    receiver = _receiver;
    minAmount = 10 * 10 ** _feeToken.decimals();
    tax = 5e16; // 5%
  }

  function contribute(uint256 amount) external whenNotPaused {
    if (amount == 0) {
      revert InvalidContributedAmount(amount);
    }

    uint256 finalAmount;
    unchecked {
      finalAmount = (amount * (1e18 + tax)) / 1e18;
    }

    feeToken.transferFrom(msg.sender, address(this), finalAmount);

    BuyerInfo storage buyerInfo = buyerInfos[msg.sender];
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

  // GETTERS
  function getBuyersLength() external view returns (uint256) {
    return buyers.length;
  }

  function getBuyers() external view returns (address[] memory) {
    return buyers;
  }

  function getBuyerInfos() external view returns (address[] memory _buyers, uint256[] memory _amounts) {
    _buyers = buyers;
    _amounts = new uint256[](buyers.length);
    for (uint256 i = 0; i < buyers.length; ) {
      _amounts[i] = buyerInfos[buyers[i]].amount;
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

  function setReceiver(address _receiver) external onlyRole(ADMIN_ROLE) {
    receiver = _receiver;
  }

  function setMinAmount(uint256 _minAmount) external onlyRole(ADMIN_ROLE) {
    minAmount = _minAmount;
  }

  function setTax(uint256 _tax) external onlyRole(ADMIN_ROLE) {
    tax = _tax;
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

  function _authorizeUpgrade(address newImplementation) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
