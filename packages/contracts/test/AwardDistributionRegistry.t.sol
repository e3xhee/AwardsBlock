// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AwardDistributionRegistry} from "../src/AwardDistributionRegistry.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

interface Vm {
    function warp(uint256 newTimestamp) external;
}

contract AwardDistributionRegistryTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    AwardDistributionRegistry private registry;

    function setUp() public {
        registry = new AwardDistributionRegistry();
    }

    function testScaffoldDeploys() public view {
        require(address(registry) != address(0), "registry not deployed");
    }

    function testCreateAwardStoresOrganizer() public {
        bytes32 awardId = keccak256("award-1");

        createValidAward(awardId);

        (address organizer,,,,,,,,,,,,,) = registry.awards(awardId);
        require(organizer == address(this), "organizer mismatch");
    }

    function testCreateAwardRejectsDuplicateAwardId() public {
        bytes32 awardId = keccak256("award-1");

        createValidAward(awardId);

        (bool success,) = address(registry)
            .call(
                abi.encodeCall(
                    registry.createAward,
                    (
                        awardId,
                        keccak256("event-2"),
                        keccak256("project-2"),
                        "https://awardblock.local/metadata/award-2.json",
                        keccak256("metadata-2"),
                        address(0xCAFE),
                        uint64(block.timestamp + 1 days),
                        uint64(block.timestamp + 8 days)
                    )
                )
            );

        require(!success, "duplicate create succeeded");
    }

    function testCreateAwardRejectsInvalidClaimWindow() public {
        (bool success,) = address(registry)
            .call(
                abi.encodeCall(
                    registry.createAward,
                    (
                        keccak256("award-invalid-window"),
                        keccak256("event-1"),
                        keccak256("project-1"),
                        "https://awardblock.local/metadata/award-invalid-window.json",
                        keccak256("metadata"),
                        address(0xCAFE),
                        uint64(block.timestamp + 8 days),
                        uint64(block.timestamp + 1 days)
                    )
                )
            );

        require(!success, "invalid claim window succeeded");
    }

    function testSetRecipientsStoresAllocations() public {
        bytes32 awardId = keccak256("award-1");
        createValidAward(awardId);

        address[] memory recipients = new address[](2);
        recipients[0] = address(0xA11CE);
        recipients[1] = address(0xB0B);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400_000000;
        amounts[1] = 600_000000;

        registry.setRecipients(awardId, recipients, amounts);

        require(
            registry.allocations(awardId, recipients[0]) == amounts[0], "first allocation mismatch"
        );
        require(
            registry.allocations(awardId, recipients[1]) == amounts[1], "second allocation mismatch"
        );

        (,,,,,, uint256 totalAllocated,,,,,, AwardDistributionRegistry.AwardStatus status,) =
            registry.awards(awardId);
        require(totalAllocated == 1_000_000000, "total allocation mismatch");
        require(
            status == AwardDistributionRegistry.AwardStatus.ReadyToFund,
            "status should be ready to fund"
        );
    }

    function testSetRecipientsRejectsMismatchedArrayLengths() public {
        bytes32 awardId = keccak256("award-1");
        createValidAward(awardId);

        address[] memory recipients = new address[](2);
        recipients[0] = address(0xA11CE);
        recipients[1] = address(0xB0B);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 400_000000;

        (bool success, bytes memory errorData) = address(registry)
            .call(abi.encodeCall(registry.setRecipients, (awardId, recipients, amounts)));

        require(!success, "mismatched arrays succeeded");
        require(
            errorSelector(errorData) == bytes4(keccak256("RecipientArrayLengthMismatch()")),
            "wrong mismatch error"
        );
    }

    function testSetRecipientsRejectsZeroAddressRecipient() public {
        bytes32 awardId = keccak256("award-1");
        createValidAward(awardId);

        address[] memory recipients = new address[](1);
        recipients[0] = address(0);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 400_000000;

        (bool success,) = address(registry)
            .call(abi.encodeCall(registry.setRecipients, (awardId, recipients, amounts)));

        require(!success, "zero address recipient succeeded");
    }

    function testSetRecipientsRejectsZeroAllocation() public {
        bytes32 awardId = keccak256("award-1");
        createValidAward(awardId);

        address[] memory recipients = new address[](1);
        recipients[0] = address(0xA11CE);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 0;

        (bool success,) = address(registry)
            .call(abi.encodeCall(registry.setRecipients, (awardId, recipients, amounts)));

        require(!success, "zero allocation succeeded");
    }

    function testSetRecipientsRejectsDuplicateRecipient() public {
        bytes32 awardId = keccak256("award-1");
        createValidAward(awardId);

        address[] memory recipients = new address[](2);
        recipients[0] = address(0xA11CE);
        recipients[1] = address(0xA11CE);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400_000000;
        amounts[1] = 600_000000;

        (bool success,) = address(registry)
            .call(abi.encodeCall(registry.setRecipients, (awardId, recipients, amounts)));

        require(!success, "duplicate recipient succeeded");
    }

    function testSetRecipientsRejectsNonOrganizer() public {
        bytes32 awardId = keccak256("award-1");
        createValidAward(awardId);

        address[] memory recipients = new address[](1);
        recipients[0] = address(0xA11CE);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 400_000000;

        RecipientSetterProxy proxy = new RecipientSetterProxy();
        bool success = proxy.trySetRecipients(registry, awardId, recipients, amounts);

        require(!success, "non organizer set recipients succeeded");
    }

    function testFundAwardTransfersApprovedRewardTokens() public {
        bytes32 awardId = keccak256("award-funded");
        uint256 totalAmount = 1_000_000000;

        MockUSDC token = prepareFundedAward(awardId, totalAmount);

        require(
            token.balanceOf(address(registry)) == totalAmount, "registry token balance mismatch"
        );

        (,,,,,,, uint256 totalDeposited,,,,, AwardDistributionRegistry.AwardStatus status,) =
            registry.awards(awardId);
        require(totalDeposited == totalAmount, "total deposited mismatch");
        require(status == AwardDistributionRegistry.AwardStatus.Funded, "status should be funded");
    }

    function testFinalizeAwardMarksFundedAwardFinalized() public {
        bytes32 awardId = keccak256("award-finalized");
        prepareFundedAward(awardId, 1_000_000000);

        uint64 expectedFinalizedAt = uint64(block.timestamp);

        registry.finalizeAward(awardId);

        (,,,,,,,,,,, uint64 finalizedAt, AwardDistributionRegistry.AwardStatus status,) =
            registry.awards(awardId);
        require(finalizedAt == expectedFinalizedAt, "finalized timestamp mismatch");
        require(
            status == AwardDistributionRegistry.AwardStatus.Finalized, "status should be finalized"
        );
    }

    function testFinalizeAwardRejectsNonOrganizer() public {
        bytes32 awardId = keccak256("award-finalize-non-organizer");
        prepareFundedAward(awardId, 1_000_000000);

        AwardFinalizerProxy proxy = new AwardFinalizerProxy();
        (bool success, bytes memory errorData) = proxy.tryFinalizeAward(registry, awardId);

        require(!success, "non organizer finalize succeeded");
        require(
            errorSelector(errorData)
                == bytes4(keccak256("UnauthorizedAwardOrganizer(bytes32,address)")),
            "wrong finalize organizer error"
        );
    }

    function testFinalizeAwardRejectsAwardThatIsNotFunded() public {
        bytes32 awardId = keccak256("award-finalize-draft");
        createValidAward(awardId);

        (bool success, bytes memory errorData) =
            address(registry).call(abi.encodeCall(registry.finalizeAward, (awardId)));

        require(!success, "draft award finalize succeeded");
        require(
            errorSelector(errorData)
                == bytes4(keccak256("InvalidAwardStatus(bytes32,uint8,uint8)")),
            "wrong finalize status error"
        );
    }

    function testClaimTransfersAllocatedRewardToRecipient() public {
        bytes32 awardId = keccak256("award-claimable");
        AwardClaimantProxy claimant = new AwardClaimantProxy();
        uint256 allocation = 400_000000;

        MockUSDC token = prepareFinalizedAwardForRecipient(
            awardId,
            address(claimant),
            allocation,
            uint64(block.timestamp),
            uint64(block.timestamp + 8 days)
        );

        bool success = claimant.tryClaim(registry, awardId);

        require(success, "claim failed");
        require(token.balanceOf(address(claimant)) == allocation, "claimant token balance mismatch");
        require(registry.claimed(awardId, address(claimant)), "claimed flag mismatch");

        (,,,,,,,, uint256 totalClaimed,,,, AwardDistributionRegistry.AwardStatus status,) =
            registry.awards(awardId);
        require(totalClaimed == allocation, "total claimed mismatch");
        require(
            status == AwardDistributionRegistry.AwardStatus.Claiming, "status should be claiming"
        );
    }

    function testClaimRejectsAwardThatIsNotFinalized() public {
        bytes32 awardId = keccak256("award-claim-not-finalized");
        AwardClaimantProxy claimant = new AwardClaimantProxy();

        prepareFundedAwardForRecipient(
            awardId,
            address(claimant),
            400_000000,
            uint64(block.timestamp),
            uint64(block.timestamp + 8 days)
        );

        (bool success, bytes memory errorData) = claimant.tryClaimWithError(registry, awardId);

        require(!success, "not finalized claim succeeded");
        require(
            errorSelector(errorData)
                == bytes4(keccak256("InvalidAwardStatus(bytes32,uint8,uint8)")),
            "wrong claim status error"
        );
    }

    function testClaimRejectsBeforeClaimWindowStarts() public {
        bytes32 awardId = keccak256("award-claim-before-window");
        AwardClaimantProxy claimant = new AwardClaimantProxy();

        prepareFinalizedAwardForRecipient(
            awardId,
            address(claimant),
            400_000000,
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 8 days)
        );

        (bool success, bytes memory errorData) = claimant.tryClaimWithError(registry, awardId);

        require(!success, "early claim succeeded");
        require(
            errorSelector(errorData)
                == bytes4(keccak256("ClaimWindowNotActive(bytes32,uint64,uint64,uint64)")),
            "wrong early claim error"
        );
    }

    function testClaimRejectsAfterClaimWindowEnds() public {
        bytes32 awardId = keccak256("award-claim-after-window");
        AwardClaimantProxy claimant = new AwardClaimantProxy();

        prepareFinalizedAwardForRecipient(
            awardId, address(claimant), 400_000000, 0, uint64(block.timestamp)
        );

        (bool success, bytes memory errorData) = claimant.tryClaimWithError(registry, awardId);

        require(!success, "late claim succeeded");
        require(
            errorSelector(errorData)
                == bytes4(keccak256("ClaimWindowNotActive(bytes32,uint64,uint64,uint64)")),
            "wrong late claim error"
        );
    }

    function testClaimRejectsUnallocatedRecipient() public {
        bytes32 awardId = keccak256("award-claim-unallocated");
        AwardClaimantProxy allocatedClaimant = new AwardClaimantProxy();
        AwardClaimantProxy unallocatedClaimant = new AwardClaimantProxy();

        prepareFinalizedAwardForRecipient(
            awardId,
            address(allocatedClaimant),
            400_000000,
            uint64(block.timestamp),
            uint64(block.timestamp + 8 days)
        );

        (bool success, bytes memory errorData) =
            unallocatedClaimant.tryClaimWithError(registry, awardId);

        require(!success, "unallocated claim succeeded");
        require(
            errorSelector(errorData) == bytes4(keccak256("RecipientNotAllocated(bytes32,address)")),
            "wrong unallocated claim error"
        );
    }

    function testClaimRejectsDuplicateClaim() public {
        bytes32 awardId = keccak256("award-claim-duplicate");
        AwardClaimantProxy claimant = new AwardClaimantProxy();

        prepareFinalizedAwardForRecipient(
            awardId,
            address(claimant),
            400_000000,
            uint64(block.timestamp),
            uint64(block.timestamp + 8 days)
        );

        bool firstClaimSuccess = claimant.tryClaim(registry, awardId);
        (bool secondClaimSuccess, bytes memory errorData) =
            claimant.tryClaimWithError(registry, awardId);

        require(firstClaimSuccess, "first claim failed");
        require(!secondClaimSuccess, "duplicate claim succeeded");
        require(
            errorSelector(errorData) == bytes4(keccak256("RewardAlreadyClaimed(bytes32,address)")),
            "wrong duplicate claim error"
        );
    }

    function testClaimCompletesAwardAfterFinalRecipientClaims() public {
        bytes32 awardId = keccak256("award-claim-completed");
        AwardClaimantProxy firstClaimant = new AwardClaimantProxy();
        AwardClaimantProxy secondClaimant = new AwardClaimantProxy();

        address[] memory recipients = new address[](2);
        recipients[0] = address(firstClaimant);
        recipients[1] = address(secondClaimant);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400_000000;
        amounts[1] = 600_000000;

        prepareFinalizedAwardForRecipients(
            awardId, recipients, amounts, uint64(block.timestamp), uint64(block.timestamp + 8 days)
        );

        bool firstClaimSuccess = firstClaimant.tryClaim(registry, awardId);
        (
            ,,,,,,,,
            uint256 firstTotalClaimed,,,,
            AwardDistributionRegistry.AwardStatus firstStatus,
        ) = registry.awards(awardId);
        bool secondClaimSuccess = secondClaimant.tryClaim(registry, awardId);

        (
            ,,,,,,
            uint256 totalAllocated,,
            uint256 totalClaimed,,,,
            AwardDistributionRegistry.AwardStatus status,
        ) = registry.awards(awardId);

        require(firstClaimSuccess, "first claim failed");
        require(
            firstStatus == AwardDistributionRegistry.AwardStatus.Claiming,
            "status should be claiming after first claim"
        );
        require(firstTotalClaimed == amounts[0], "first total claimed mismatch");
        require(secondClaimSuccess, "second claim failed");
        require(totalClaimed == totalAllocated, "final total claimed mismatch");
        require(
            status == AwardDistributionRegistry.AwardStatus.Completed, "status should be completed"
        );
    }

    function testCloseAwardReturnsUnclaimedRewardsAfterClaimWindowEnds() public {
        bytes32 awardId = keccak256("award-close-unclaimed");
        AwardClaimantProxy firstClaimant = new AwardClaimantProxy();
        AwardClaimantProxy secondClaimant = new AwardClaimantProxy();

        address[] memory recipients = new address[](2);
        recipients[0] = address(firstClaimant);
        recipients[1] = address(secondClaimant);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400_000000;
        amounts[1] = 600_000000;
        uint64 claimEnd = uint64(block.timestamp + 8 days);

        MockUSDC token = prepareFinalizedAwardForRecipients(
            awardId, recipients, amounts, uint64(block.timestamp), claimEnd
        );

        bool firstClaimSuccess = firstClaimant.tryClaim(registry, awardId);
        require(firstClaimSuccess, "first claim failed");
        require(token.balanceOf(address(registry)) == amounts[1], "registry remainder mismatch");

        vm.warp(claimEnd);

        registry.closeAward(awardId);

        (,,,,,,,, uint256 totalClaimed,,,, AwardDistributionRegistry.AwardStatus status,) =
            registry.awards(awardId);
        require(totalClaimed == amounts[0], "total claimed mismatch");
        require(status == AwardDistributionRegistry.AwardStatus.Closed, "status should be closed");
        require(token.balanceOf(address(registry)) == 0, "registry balance should be empty");
        require(token.balanceOf(address(this)) == amounts[1], "organizer refund mismatch");
    }

    function testCloseAwardRejectsNonOrganizer() public {
        bytes32 awardId = keccak256("award-close-non-organizer");
        AwardClaimantProxy claimant = new AwardClaimantProxy();

        prepareFinalizedAwardForRecipient(
            awardId, address(claimant), 400_000000, 0, uint64(block.timestamp)
        );

        AwardCloserProxy proxy = new AwardCloserProxy();
        (bool success, bytes memory errorData) = proxy.tryCloseAward(registry, awardId);

        require(!success, "non organizer close succeeded");
        require(
            errorSelector(errorData)
                == bytes4(keccak256("UnauthorizedAwardOrganizer(bytes32,address)")),
            "wrong close organizer error"
        );
    }

    function testCloseAwardRejectsBeforeClaimWindowEnds() public {
        bytes32 awardId = keccak256("award-close-before-window-end");
        AwardClaimantProxy claimant = new AwardClaimantProxy();

        prepareFinalizedAwardForRecipient(
            awardId,
            address(claimant),
            400_000000,
            uint64(block.timestamp),
            uint64(block.timestamp + 8 days)
        );

        (bool success, bytes memory errorData) =
            address(registry).call(abi.encodeCall(registry.closeAward, (awardId)));

        require(!success, "early close succeeded");
        require(
            errorSelector(errorData)
                == bytes4(keccak256("ClaimWindowNotEnded(bytes32,uint64,uint64)")),
            "wrong early close error"
        );
    }

    function testCloseAwardRejectsAwardThatIsNotFinalizedOrClaiming() public {
        bytes32 awardId = keccak256("award-close-draft");
        createValidAward(awardId);

        (bool success, bytes memory errorData) =
            address(registry).call(abi.encodeCall(registry.closeAward, (awardId)));

        require(!success, "draft award close succeeded");
        require(
            errorSelector(errorData)
                == bytes4(keccak256("InvalidAwardStatus(bytes32,uint8,uint8)")),
            "wrong close status error"
        );
    }

    function testSupersedeAwardLinksOldAwardToReplacement() public {
        bytes32 oldAwardId = keccak256("award-supersede-old");
        bytes32 newAwardId = keccak256("award-supersede-new");
        bytes32 reasonHash = keccak256("incorrect recipients");

        createValidAward(oldAwardId);
        createValidAward(newAwardId);

        registry.supersedeAward(oldAwardId, newAwardId, reasonHash);

        (,,,,,,,,,,,, AwardDistributionRegistry.AwardStatus oldStatus, bytes32 supersededBy) =
            registry.awards(oldAwardId);
        (,,,,,,,,,,,, AwardDistributionRegistry.AwardStatus newStatus,) =
            registry.awards(newAwardId);

        require(
            oldStatus == AwardDistributionRegistry.AwardStatus.Superseded, "old status mismatch"
        );
        require(supersededBy == newAwardId, "replacement award mismatch");
        require(
            newStatus == AwardDistributionRegistry.AwardStatus.Draft, "new award status changed"
        );
    }

    function testSupersedeAwardRejectsNonOrganizer() public {
        bytes32 oldAwardId = keccak256("award-supersede-non-organizer-old");
        bytes32 newAwardId = keccak256("award-supersede-non-organizer-new");
        bytes32 reasonHash = keccak256("incorrect metadata");

        createValidAward(oldAwardId);
        createValidAward(newAwardId);

        AwardSupersederProxy proxy = new AwardSupersederProxy();
        (bool success, bytes memory errorData) =
            proxy.trySupersedeAward(registry, oldAwardId, newAwardId, reasonHash);

        require(!success, "non organizer supersede succeeded");
        require(
            errorSelector(errorData)
                == bytes4(keccak256("UnauthorizedAwardOrganizer(bytes32,address)")),
            "wrong supersede organizer error"
        );
    }

    function testSupersedeAwardRejectsMissingReplacementAward() public {
        bytes32 oldAwardId = keccak256("award-supersede-missing-new-old");
        bytes32 missingNewAwardId = keccak256("award-supersede-missing-new");
        bytes32 reasonHash = keccak256("incorrect reward token");

        createValidAward(oldAwardId);

        (bool success, bytes memory errorData) = address(registry)
            .call(
                abi.encodeCall(registry.supersedeAward, (oldAwardId, missingNewAwardId, reasonHash))
            );

        require(!success, "missing replacement supersede succeeded");
        require(
            errorSelector(errorData) == bytes4(keccak256("AwardNotFound(bytes32)")),
            "wrong missing replacement error"
        );
    }

    function testPauseBlocksRewardClaims() public {
        bytes32 awardId = keccak256("award-pause-claim");
        AwardClaimantProxy claimant = new AwardClaimantProxy();

        prepareFinalizedAwardForRecipient(
            awardId,
            address(claimant),
            400_000000,
            uint64(block.timestamp),
            uint64(block.timestamp + 8 days)
        );

        registry.pause();

        (bool success, bytes memory errorData) = claimant.tryClaimWithError(registry, awardId);

        require(!success, "paused claim succeeded");
        require(
            errorSelector(errorData) == bytes4(keccak256("ContractPaused()")),
            "wrong paused claim error"
        );
    }

    function testUnpauseRestoresRewardClaims() public {
        bytes32 awardId = keccak256("award-unpause-claim");
        AwardClaimantProxy claimant = new AwardClaimantProxy();

        prepareFinalizedAwardForRecipient(
            awardId,
            address(claimant),
            400_000000,
            uint64(block.timestamp),
            uint64(block.timestamp + 8 days)
        );

        registry.pause();
        registry.unpause();

        bool success = claimant.tryClaim(registry, awardId);

        require(success, "unpaused claim failed");
    }

    function testPauseRejectsNonOwner() public {
        AwardPauseProxy proxy = new AwardPauseProxy();

        (bool success, bytes memory errorData) = proxy.tryPause(registry);

        require(!success, "non owner pause succeeded");
        require(
            errorSelector(errorData) == bytes4(keccak256("UnauthorizedOwner(address)")),
            "wrong pause owner error"
        );
    }

    function testUnpauseRejectsNonOwner() public {
        registry.pause();

        AwardPauseProxy proxy = new AwardPauseProxy();
        (bool success, bytes memory errorData) = proxy.tryUnpause(registry);

        require(!success, "non owner unpause succeeded");
        require(
            errorSelector(errorData) == bytes4(keccak256("UnauthorizedOwner(address)")),
            "wrong unpause owner error"
        );
    }

    function testPauseBlocksAwardFunding() public {
        bytes32 awardId = keccak256("award-pause-fund");
        MockUSDC token = new MockUSDC();
        createAwardWithToken(awardId, address(token));

        address[] memory recipients = new address[](1);
        recipients[0] = address(0xA11CE);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 400_000000;

        registry.setRecipients(awardId, recipients, amounts);
        token.mint(address(this), amounts[0]);
        token.approve(address(registry), amounts[0]);
        registry.pause();

        (bool success, bytes memory errorData) =
            address(registry).call(abi.encodeCall(registry.fundAward, (awardId, amounts[0])));

        require(!success, "paused fund succeeded");
        require(
            errorSelector(errorData) == bytes4(keccak256("ContractPaused()")),
            "wrong paused fund error"
        );
    }

    function testPauseBlocksAwardFinalization() public {
        bytes32 awardId = keccak256("award-pause-finalize");
        prepareFundedAward(awardId, 1_000_000000);

        registry.pause();

        (bool success, bytes memory errorData) =
            address(registry).call(abi.encodeCall(registry.finalizeAward, (awardId)));

        require(!success, "paused finalize succeeded");
        require(
            errorSelector(errorData) == bytes4(keccak256("ContractPaused()")),
            "wrong paused finalize error"
        );
    }

    function testPauseBlocksAwardClosure() public {
        bytes32 awardId = keccak256("award-pause-close");
        AwardClaimantProxy claimant = new AwardClaimantProxy();
        uint64 claimEnd = uint64(block.timestamp + 8 days);

        prepareFinalizedAwardForRecipient(
            awardId, address(claimant), 400_000000, uint64(block.timestamp), claimEnd
        );
        vm.warp(claimEnd);
        registry.pause();

        (bool success, bytes memory errorData) =
            address(registry).call(abi.encodeCall(registry.closeAward, (awardId)));

        require(!success, "paused close succeeded");
        require(
            errorSelector(errorData) == bytes4(keccak256("ContractPaused()")),
            "wrong paused close error"
        );
    }

    function testPauseBlocksAwardSuperseding() public {
        bytes32 oldAwardId = keccak256("award-pause-supersede-old");
        bytes32 newAwardId = keccak256("award-pause-supersede-new");
        bytes32 reasonHash = keccak256("pause supersede");

        createValidAward(oldAwardId);
        createValidAward(newAwardId);
        registry.pause();

        (bool success, bytes memory errorData) = address(registry)
            .call(abi.encodeCall(registry.supersedeAward, (oldAwardId, newAwardId, reasonHash)));

        require(!success, "paused supersede succeeded");
        require(
            errorSelector(errorData) == bytes4(keccak256("ContractPaused()")),
            "wrong paused supersede error"
        );
    }

    function prepareFundedAward(bytes32 awardId, uint256 totalAmount)
        private
        returns (MockUSDC token)
    {
        token = new MockUSDC();
        createAwardWithToken(awardId, address(token));

        address[] memory recipients = new address[](2);
        recipients[0] = address(0xA11CE);
        recipients[1] = address(0xB0B);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400_000000;
        amounts[1] = totalAmount - amounts[0];

        registry.setRecipients(awardId, recipients, amounts);
        token.mint(address(this), totalAmount);
        token.approve(address(registry), totalAmount);
        registry.fundAward(awardId, totalAmount);
    }

    function prepareFundedAwardForRecipient(
        bytes32 awardId,
        address recipient,
        uint256 allocation,
        uint64 claimStart,
        uint64 claimEnd
    ) private returns (MockUSDC token) {
        uint256 totalAmount = 1_000_000000;
        token = new MockUSDC();
        createAwardWithTokenAndClaimWindow(awardId, address(token), claimStart, claimEnd);

        address[] memory recipients = new address[](2);
        recipients[0] = recipient;
        recipients[1] = address(0xB0B);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = allocation;
        amounts[1] = totalAmount - allocation;

        registry.setRecipients(awardId, recipients, amounts);
        token.mint(address(this), totalAmount);
        token.approve(address(registry), totalAmount);
        registry.fundAward(awardId, totalAmount);
    }

    function prepareFinalizedAwardForRecipient(
        bytes32 awardId,
        address recipient,
        uint256 allocation,
        uint64 claimStart,
        uint64 claimEnd
    ) private returns (MockUSDC token) {
        token = prepareFundedAwardForRecipient(awardId, recipient, allocation, claimStart, claimEnd);
        registry.finalizeAward(awardId);
    }

    function prepareFinalizedAwardForRecipients(
        bytes32 awardId,
        address[] memory recipients,
        uint256[] memory amounts,
        uint64 claimStart,
        uint64 claimEnd
    ) private returns (MockUSDC token) {
        uint256 totalAmount;
        for (uint256 index = 0; index < amounts.length; index++) {
            totalAmount += amounts[index];
        }

        token = new MockUSDC();
        createAwardWithTokenAndClaimWindow(awardId, address(token), claimStart, claimEnd);

        registry.setRecipients(awardId, recipients, amounts);
        token.mint(address(this), totalAmount);
        token.approve(address(registry), totalAmount);
        registry.fundAward(awardId, totalAmount);
        registry.finalizeAward(awardId);
    }

    function createValidAward(bytes32 awardId) private {
        createAwardWithToken(awardId, address(0xCAFE));
    }

    function createAwardWithToken(bytes32 awardId, address rewardToken) private {
        createAwardWithTokenAndClaimWindow(
            awardId, rewardToken, uint64(block.timestamp + 1 days), uint64(block.timestamp + 8 days)
        );
    }

    function createAwardWithTokenAndClaimWindow(
        bytes32 awardId,
        address rewardToken,
        uint64 claimStart,
        uint64 claimEnd
    ) private {
        registry.createAward(
            awardId,
            keccak256("event-1"),
            keccak256("project-1"),
            "https://awardblock.local/metadata/award-1.json",
            keccak256("metadata"),
            rewardToken,
            claimStart,
            claimEnd
        );
    }

    function errorSelector(bytes memory errorData) private pure returns (bytes4 selector) {
        require(errorData.length >= 4, "missing error selector");

        assembly {
            selector := mload(add(errorData, 32))
        }
    }
}

contract RecipientSetterProxy {
    function trySetRecipients(
        AwardDistributionRegistry registry,
        bytes32 awardId,
        address[] memory recipients,
        uint256[] memory amounts
    ) external returns (bool) {
        (bool success,) = address(registry)
            .call(abi.encodeCall(registry.setRecipients, (awardId, recipients, amounts)));
        return success;
    }
}

contract AwardFinalizerProxy {
    function tryFinalizeAward(AwardDistributionRegistry registry, bytes32 awardId)
        external
        returns (bool, bytes memory)
    {
        return address(registry).call(abi.encodeCall(registry.finalizeAward, (awardId)));
    }
}

contract AwardClaimantProxy {
    function tryClaim(AwardDistributionRegistry registry, bytes32 awardId) external returns (bool) {
        (bool success,) = address(registry).call(abi.encodeCall(registry.claim, (awardId)));
        return success;
    }

    function tryClaimWithError(AwardDistributionRegistry registry, bytes32 awardId)
        external
        returns (bool, bytes memory)
    {
        return address(registry).call(abi.encodeCall(registry.claim, (awardId)));
    }
}

contract AwardCloserProxy {
    function tryCloseAward(AwardDistributionRegistry registry, bytes32 awardId)
        external
        returns (bool, bytes memory)
    {
        return address(registry).call(abi.encodeCall(registry.closeAward, (awardId)));
    }
}

contract AwardSupersederProxy {
    function trySupersedeAward(
        AwardDistributionRegistry registry,
        bytes32 oldAwardId,
        bytes32 newAwardId,
        bytes32 reasonHash
    ) external returns (bool, bytes memory) {
        return address(registry)
            .call(abi.encodeCall(registry.supersedeAward, (oldAwardId, newAwardId, reasonHash)));
    }
}

contract AwardPauseProxy {
    function tryPause(AwardDistributionRegistry registry) external returns (bool, bytes memory) {
        return address(registry).call(abi.encodeCall(registry.pause, ()));
    }

    function tryUnpause(AwardDistributionRegistry registry) external returns (bool, bytes memory) {
        return address(registry).call(abi.encodeCall(registry.unpause, ()));
    }
}
