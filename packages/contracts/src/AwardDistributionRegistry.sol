// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract AwardDistributionRegistry {
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

    event AwardCreated(bytes32 indexed awardId, bytes32 indexed eventId, bytes32 indexed projectId, address organizer);
    event RecipientsAssigned(bytes32 indexed awardId, uint256 recipientCount, uint256 totalAllocated);
    event AwardFunded(bytes32 indexed awardId, address indexed token, uint256 amount);
    event AwardFinalized(bytes32 indexed awardId, bytes32 metadataHash, uint256 totalAllocated);
    event RewardClaimed(bytes32 indexed awardId, address indexed recipient, uint256 amount);
    event AwardSuperseded(bytes32 indexed oldAwardId, bytes32 indexed newAwardId, bytes32 reasonHash);
    event AwardClosed(bytes32 indexed awardId, uint256 returnedAmount);

    error NotImplemented();

    function createAward(
        bytes32,
        bytes32,
        bytes32,
        string calldata,
        bytes32,
        address,
        uint64,
        uint64
    ) external pure {
        revert NotImplemented();
    }

    function setRecipients(bytes32, address[] calldata, uint256[] calldata) external pure {
        revert NotImplemented();
    }

    function fundAward(bytes32, uint256) external pure {
        revert NotImplemented();
    }

    function finalizeAward(bytes32) external pure {
        revert NotImplemented();
    }

    function claim(bytes32) external pure {
        revert NotImplemented();
    }

    function supersedeAward(bytes32, bytes32, bytes32) external pure {
        revert NotImplemented();
    }

    function closeAward(bytes32) external pure {
        revert NotImplemented();
    }

    function pause() external pure {
        revert NotImplemented();
    }

    function unpause() external pure {
        revert NotImplemented();
    }
}
