// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {UUPSUpgradeable} from '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';

import {AccessControlUpgradeable} from '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import {PausableUpgradeable} from '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/cryptography/MerkleProof.sol';

contract CSClaim is AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable {
  using SafeERC20 for IERC20;

  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
  bytes32 public constant SYNDICATE_ROLE = keccak256('SYNDICATE_ROLE');
  uint256 public constant FULL_100 = 100e18;

  uint256 public nextId;

  address public receiver; // Address will receive fee amount
  uint public feePercentage; // Xe18

  mapping(uint256 => PoolInfo) public pools;
  mapping(uint256 => ScheduleVesting[]) public schedules;

  // pool => user => claimed amount
  mapping(uint256 => mapping(address => uint256)) public claimedAmounts;

  struct PoolInfo {
    address owner;
    IERC20 token;
    bytes32 root;
    uint256 feePercentage;
    uint256 fundedAmount;
    uint256 claimedAmount;
  }

  struct ScheduleVesting {
    uint256 date;
    uint256 endDate;
    uint256 unlockPercent;
    uint256 period;
  }

  event PoolCreated(uint256 id, address owner, IERC20 token);
  event Claimed(address indexed claimer, uint256 tokenAmount, uint256 feeAmount);

  modifier onlyAdminOrOwner(uint256 id) {
    require(hasRole(ADMIN_ROLE, msg.sender) || pools[id].owner == msg.sender, 'Not admin or owner');
    _;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(address _owner, address _receiver, uint _feePercentage) public initializer {
    __UUPSUpgradeable_init();
    __AccessControl_init();
    __Pausable_init();

    _grantRole(DEFAULT_ADMIN_ROLE, _owner);
    _grantRole(ADMIN_ROLE, _owner);

    receiver = _receiver;
    feePercentage = _feePercentage;
  }

  function verify(uint256 id, bytes32[] memory proof, address addr, uint256 amount) public view {
    bytes32 root = pools[id].root;
    bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(addr, amount))));
    require(MerkleProof.verify(proof, root, leaf), 'Invalid proof');
  }

  function claim(uint256 id, uint256 index, uint256 _totalAmount, bytes32[] memory _proof) external whenNotPaused {
    verify(id, _proof, msg.sender, _totalAmount);

    PoolInfo storage pool = pools[id];
    ScheduleVesting memory schedule = schedules[id][index];

    require(block.timestamp >= schedule.date, 'Not started yet');

    uint256 claimablePercent;
    if (schedule.date == schedule.endDate || block.timestamp > schedule.endDate) {
      // Claim all
      claimablePercent = schedule.unlockPercent;
    } else {
      uint256 curPercent;
      if (index > 0) {
        unchecked {
          claimablePercent = schedules[id][index - 1].unlockPercent;
          curPercent = schedule.unlockPercent - claimablePercent;
        }
      } else {
        claimablePercent = 0;
        curPercent = schedule.unlockPercent;
      }
      uint256 total;
      uint256 cur;
      unchecked {
        total = 1 + (schedule.endDate - schedule.date) / schedule.period;
        cur = 1 + (block.timestamp - schedule.date) / schedule.period;
        claimablePercent += (cur * curPercent) / total;
      }
      if (claimablePercent > schedule.unlockPercent) {
        // just sure
        claimablePercent = schedule.unlockPercent;
      }
    }

    uint256 _maxClaim;
    unchecked {
      _maxClaim = (_totalAmount * claimablePercent) / FULL_100;
    }
    uint256 claimed = claimedAmounts[id][msg.sender];
    if (_maxClaim > claimed) {
      uint256 _claimableAmount;
      unchecked {
        _claimableAmount = _maxClaim - claimed;
        pool.claimedAmount += _claimableAmount;
      }
      require(pool.fundedAmount >= pool.claimedAmount, 'Not enough fund');
      claimedAmounts[id][msg.sender] = _maxClaim;
      if (pool.feePercentage > 0) {
        uint256 _feeAmount;
        unchecked {
          _feeAmount = (_claimableAmount * pool.feePercentage) / FULL_100;
        }
        pool.token.safeTransfer(receiver, _feeAmount); // Transfer fee
        emit Claimed(msg.sender, _claimableAmount, _feeAmount);
        unchecked {
          _claimableAmount -= _feeAmount;
        }
      } else {
        emit Claimed(msg.sender, _claimableAmount, 0);
      }
      pool.token.safeTransfer(msg.sender, _claimableAmount); // Transfer fee
    }
  }

  function fund(uint256 id, uint256 amount) external {
    PoolInfo storage poolInfo = pools[id];
    poolInfo.token.safeTransferFrom(msg.sender, address(this), amount);
    poolInfo.fundedAmount += amount;
  }

  // GETTERS
  function getSchedules(uint256 id) external view returns (ScheduleVesting[] memory) {
    return schedules[id];
  }

  /// POOL owner FUNCTIONS
  function syncdicateAdd(IERC20 _token, bytes32 _root) external onlyRole(SYNDICATE_ROLE) whenNotPaused {
    _addPool(msg.sender, _token, _root, feePercentage);
  }

  function setSchedules(uint256 id, ScheduleVesting[] calldata _schedules) external onlyAdminOrOwner(id) {
    delete schedules[id];
    for (uint256 i = 0; i < _schedules.length; ) {
      ScheduleVesting memory schedule = _schedules[i];
      require(schedule.endDate >= schedule.date, 'Invalid date');
      require(schedule.period > 0 || schedule.endDate == schedule.date, 'Invalid period');
      require(schedule.unlockPercent <= FULL_100, 'Invalid percent');
      schedules[id].push(schedule);
      unchecked {
        i++;
      }
    }
  }

  function setRoot(uint256 id, bytes32 _root) external onlyAdminOrOwner(id) {
    pools[id].root = _root;
  }

  function withdraw(uint256 id) external onlyAdminOrOwner(id) {
    PoolInfo storage poolInfo = pools[id];
    uint256 diff = poolInfo.fundedAmount - poolInfo.claimedAmount;
    poolInfo.fundedAmount = poolInfo.claimedAmount;
    poolInfo.token.safeTransfer(msg.sender, diff);
  }

  /// ADMIN FUNCTIONS
  function adminAdd(
    address _owner,
    IERC20 _token,
    bytes32 _root,
    uint256 _feePercentage
  ) external onlyRole(ADMIN_ROLE) {
    _addPool(_owner, _token, _root, _feePercentage);
  }

  function setPoolFeePercentage(uint256 id, uint256 _feePercentage) external onlyRole(ADMIN_ROLE) {
    pools[id].feePercentage = _feePercentage;
  }

  function pause() external onlyRole(ADMIN_ROLE) {
    _pause();
  }

  function unpause() external onlyRole(ADMIN_ROLE) {
    _unpause();
  }

  /// SUPER ADMIN FUNCTIONS
  function setFeePercentage(uint _feePercentage) external onlyRole(DEFAULT_ADMIN_ROLE) {
    feePercentage = _feePercentage;
  }

  function setReceiver(address _receiver) external onlyRole(DEFAULT_ADMIN_ROLE) {
    receiver = _receiver;
  }

  function removeToken(IERC20 _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
    uint256 balance = _token.balanceOf(address(this));
    _token.transfer(msg.sender, balance);
  }

  function _authorizeUpgrade(address) internal virtual override onlyRole(DEFAULT_ADMIN_ROLE) {}

  function _addPool(address _owner, IERC20 _token, bytes32 _root, uint256 _feePercentage) internal {
    pools[nextId] = PoolInfo({
      owner: _owner,
      token: _token,
      root: _root,
      feePercentage: _feePercentage,
      fundedAmount: 0,
      claimedAmount: 0
    });
    emit PoolCreated(nextId, _owner, _token);
    unchecked {
      nextId++;
    }
  }
}
