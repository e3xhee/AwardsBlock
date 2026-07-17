// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AwardDistributionRegistry} from "../src/AwardDistributionRegistry.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract AwardDistributionRegistryTest {
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
        MockUSDC token = new MockUSDC();
        createAwardWithToken(awardId, address(token));

        address[] memory recipients = new address[](2);
        recipients[0] = address(0xA11CE);
        recipients[1] = address(0xB0B);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400_000000;
        amounts[1] = 600_000000;
        uint256 totalAmount = 1_000_000000;

        registry.setRecipients(awardId, recipients, amounts);
        token.mint(address(this), totalAmount);
        token.approve(address(registry), totalAmount);

        registry.fundAward(awardId, totalAmount);

        require(
            token.balanceOf(address(registry)) == totalAmount, "registry token balance mismatch"
        );

        (,,,,,,, uint256 totalDeposited,,,,, AwardDistributionRegistry.AwardStatus status,) =
            registry.awards(awardId);
        require(totalDeposited == totalAmount, "total deposited mismatch");
        require(status == AwardDistributionRegistry.AwardStatus.Funded, "status should be funded");
    }

    function createValidAward(bytes32 awardId) private {
        createAwardWithToken(awardId, address(0xCAFE));
    }

    function createAwardWithToken(bytes32 awardId, address rewardToken) private {
        registry.createAward(
            awardId,
            keccak256("event-1"),
            keccak256("project-1"),
            "https://awardblock.local/metadata/award-1.json",
            keccak256("metadata"),
            rewardToken,
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 8 days)
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
