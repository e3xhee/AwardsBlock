// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AwardDistributionRegistry} from "../src/AwardDistributionRegistry.sol";

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

        registry.createAward(
            awardId,
            keccak256("event-1"),
            keccak256("project-1"),
            "https://awardblock.local/metadata/award-1.json",
            keccak256("metadata"),
            address(0xCAFE),
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 8 days)
        );

        (address organizer,,,,,,,,,,,,,) = registry.awards(awardId);
        require(organizer == address(this), "organizer mismatch");
    }
}
