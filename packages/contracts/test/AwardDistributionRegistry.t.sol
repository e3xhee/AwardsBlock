// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {AwardDistributionRegistry} from "../src/AwardDistributionRegistry.sol";

contract AwardDistributionRegistryTest is Test {
    AwardDistributionRegistry private registry;

    function setUp() public {
        registry = new AwardDistributionRegistry();
    }

    function testScaffoldDeploys() public view {
        assertTrue(address(registry) != address(0));
    }
}
