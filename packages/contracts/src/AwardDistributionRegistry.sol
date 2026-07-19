// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AwardDistributionRegistry is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable owner;
    bool public paused;

    enum AwardStatus {
        Draft,
        AwaitingRecipients,
        ReadyToFund,
        Funded,
        Finalized,
        Claiming,
        Completed,
        Superseded,
        Closed
    }

    struct Award {
        address organizer;
        bytes32 eventId;
        bytes32 projectId;
        string metadataURI;
        bytes32 metadataHash;
        address rewardToken;
        uint256 totalAllocated;
        uint256 totalDeposited;
        uint256 totalClaimed;
        uint64 claimStart;
        uint64 claimEnd;
        uint64 finalizedAt;
        AwardStatus status;
        bytes32 supersededBy;
    }

    mapping(bytes32 => Award) public awards;
    mapping(bytes32 => mapping(address => uint256)) public allocations;
    mapping(bytes32 => mapping(address => bool)) public claimed;

    event AwardCreated(
        bytes32 indexed awardId,
        bytes32 indexed eventId,
        bytes32 indexed projectId,
        address organizer
    );
    event RecipientsAssigned(
        bytes32 indexed awardId, uint256 recipientCount, uint256 totalAllocated
    );
    event AwardFunded(bytes32 indexed awardId, address indexed token, uint256 amount);
    event AwardFinalized(bytes32 indexed awardId, bytes32 metadataHash, uint256 totalAllocated);
    event RewardClaimed(bytes32 indexed awardId, address indexed recipient, uint256 amount);
    event AwardSuperseded(
        bytes32 indexed oldAwardId, bytes32 indexed newAwardId, bytes32 reasonHash
    );
    event AwardClosed(bytes32 indexed awardId, uint256 returnedAmount);
    event Paused(address indexed account);
    event Unpaused(address indexed account);

    error AwardAlreadyExists(bytes32 awardId);
    error AwardNotFound(bytes32 awardId);
    error ClaimWindowNotEnded(bytes32 awardId, uint64 currentTime, uint64 claimEnd);
    error ClaimWindowNotActive(
        bytes32 awardId, uint64 currentTime, uint64 claimStart, uint64 claimEnd
    );
    error InvalidAwardStatus(bytes32 awardId, uint8 currentStatus, uint8 requiredStatus);
    error InvalidClaimWindow(uint64 claimStart, uint64 claimEnd);
    error InvalidRecipientAllocation();
    error InvalidRecipientAddress();
    error NotImplemented();
    error RecipientArrayLengthMismatch();
    error RecipientAlreadyAssigned(address recipient);
    error RecipientNotAllocated(bytes32 awardId, address recipient);
    error RewardAlreadyClaimed(bytes32 awardId, address recipient);
    error ContractPaused();
    error UnauthorizedOwner(address caller);
    error UnauthorizedAwardOrganizer(bytes32 awardId, address caller);

    constructor() {
        owner = msg.sender;
    }

    modifier whenNotPaused() {
        if (paused) {
            revert ContractPaused();
        }
        _;
    }

    function createAward(
        bytes32 awardId,
        bytes32 eventId,
        bytes32 projectId,
        string calldata metadataURI,
        bytes32 metadataHash,
        address rewardToken,
        uint64 claimStart,
        uint64 claimEnd
    ) external nonReentrant {
        if (awards[awardId].organizer != address(0)) {
            revert AwardAlreadyExists(awardId);
        }
        if (claimStart >= claimEnd) {
            revert InvalidClaimWindow(claimStart, claimEnd);
        }

        awards[awardId] = Award({
            organizer: msg.sender,
            eventId: eventId,
            projectId: projectId,
            metadataURI: metadataURI,
            metadataHash: metadataHash,
            rewardToken: rewardToken,
            totalAllocated: 0,
            totalDeposited: 0,
            totalClaimed: 0,
            claimStart: claimStart,
            claimEnd: claimEnd,
            finalizedAt: 0,
            status: AwardStatus.Draft,
            supersededBy: bytes32(0)
        });

        emit AwardCreated(awardId, eventId, projectId, msg.sender);
    }

    function setRecipients(
        bytes32 awardId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external nonReentrant {
        Award storage award = awards[awardId];

        if (award.organizer != msg.sender) {
            revert UnauthorizedAwardOrganizer(awardId, msg.sender);
        }
        if (award.status != AwardStatus.Draft) {
            revert InvalidAwardStatus(awardId, uint8(award.status), uint8(AwardStatus.Draft));
        }
        if (recipients.length != amounts.length) {
            revert RecipientArrayLengthMismatch();
        }

        uint256 totalAllocated;

        for (uint256 index = 0; index < recipients.length; index++) {
            if (recipients[index] == address(0)) {
                revert InvalidRecipientAddress();
            }
            if (amounts[index] == 0) {
                revert InvalidRecipientAllocation();
            }
            for (uint256 previousIndex = 0; previousIndex < index; previousIndex++) {
                if (recipients[previousIndex] == recipients[index]) {
                    revert RecipientAlreadyAssigned(recipients[index]);
                }
            }

            allocations[awardId][recipients[index]] = amounts[index];
            totalAllocated += amounts[index];
        }

        award.totalAllocated = totalAllocated;
        award.status = AwardStatus.ReadyToFund;

        emit RecipientsAssigned(awardId, recipients.length, totalAllocated);
    }

    function fundAward(bytes32 awardId, uint256 amount) external whenNotPaused nonReentrant {
        Award storage award = awards[awardId];

        if (award.organizer != msg.sender) {
            revert UnauthorizedAwardOrganizer(awardId, msg.sender);
        }
        if (award.status != AwardStatus.ReadyToFund) {
            revert InvalidAwardStatus(awardId, uint8(award.status), uint8(AwardStatus.ReadyToFund));
        }

        award.totalDeposited += amount;
        if (award.totalDeposited >= award.totalAllocated) {
            award.status = AwardStatus.Funded;
        }

        IERC20(award.rewardToken).safeTransferFrom(msg.sender, address(this), amount);

        emit AwardFunded(awardId, award.rewardToken, amount);
    }

    function finalizeAward(bytes32 awardId) external whenNotPaused nonReentrant {
        Award storage award = awards[awardId];

        if (award.organizer != msg.sender) {
            revert UnauthorizedAwardOrganizer(awardId, msg.sender);
        }
        if (award.status != AwardStatus.Funded) {
            revert InvalidAwardStatus(awardId, uint8(award.status), uint8(AwardStatus.Funded));
        }

        award.finalizedAt = uint64(block.timestamp);
        award.status = AwardStatus.Finalized;

        emit AwardFinalized(awardId, award.metadataHash, award.totalAllocated);
    }

    function claim(bytes32 awardId) external whenNotPaused nonReentrant {
        Award storage award = awards[awardId];

        if (award.status != AwardStatus.Finalized && award.status != AwardStatus.Claiming) {
            revert InvalidAwardStatus(awardId, uint8(award.status), uint8(AwardStatus.Finalized));
        }

        uint64 currentTime = uint64(block.timestamp);
        if (currentTime < award.claimStart || currentTime >= award.claimEnd) {
            revert ClaimWindowNotActive(awardId, currentTime, award.claimStart, award.claimEnd);
        }

        uint256 amount = allocations[awardId][msg.sender];
        if (amount == 0) {
            revert RecipientNotAllocated(awardId, msg.sender);
        }
        if (claimed[awardId][msg.sender]) {
            revert RewardAlreadyClaimed(awardId, msg.sender);
        }

        claimed[awardId][msg.sender] = true;
        award.totalClaimed += amount;
        if (award.status == AwardStatus.Finalized) {
            award.status = AwardStatus.Claiming;
        }
        if (award.totalClaimed >= award.totalAllocated) {
            award.status = AwardStatus.Completed;
        }

        IERC20(award.rewardToken).safeTransfer(msg.sender, amount);

        emit RewardClaimed(awardId, msg.sender, amount);
    }

    function supersedeAward(bytes32 oldAwardId, bytes32 newAwardId, bytes32 reasonHash)
        external
        whenNotPaused
        nonReentrant
    {
        Award storage oldAward = awards[oldAwardId];
        Award storage newAward = awards[newAwardId];

        if (oldAward.organizer == address(0)) {
            revert AwardNotFound(oldAwardId);
        }
        if (newAward.organizer == address(0)) {
            revert AwardNotFound(newAwardId);
        }
        if (oldAward.organizer != msg.sender) {
            revert UnauthorizedAwardOrganizer(oldAwardId, msg.sender);
        }
        if (newAward.organizer != msg.sender) {
            revert UnauthorizedAwardOrganizer(newAwardId, msg.sender);
        }

        oldAward.status = AwardStatus.Superseded;
        oldAward.supersededBy = newAwardId;

        emit AwardSuperseded(oldAwardId, newAwardId, reasonHash);
    }

    function closeAward(bytes32 awardId) external whenNotPaused nonReentrant {
        Award storage award = awards[awardId];

        if (award.organizer != msg.sender) {
            revert UnauthorizedAwardOrganizer(awardId, msg.sender);
        }
        if (award.status != AwardStatus.Finalized && award.status != AwardStatus.Claiming) {
            revert InvalidAwardStatus(awardId, uint8(award.status), uint8(AwardStatus.Finalized));
        }

        uint64 currentTime = uint64(block.timestamp);
        if (currentTime < award.claimEnd) {
            revert ClaimWindowNotEnded(awardId, currentTime, award.claimEnd);
        }

        uint256 returnedAmount = award.totalDeposited - award.totalClaimed;

        award.status = AwardStatus.Closed;

        if (returnedAmount > 0) {
            IERC20(award.rewardToken).safeTransfer(msg.sender, returnedAmount);
        }

        emit AwardClosed(awardId, returnedAmount);
    }

    function pause() external {
        if (msg.sender != owner) {
            revert UnauthorizedOwner(msg.sender);
        }

        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external {
        if (msg.sender != owner) {
            revert UnauthorizedOwner(msg.sender);
        }

        paused = false;
        emit Unpaused(msg.sender);
    }
}
