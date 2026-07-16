// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {AwardDistributionRegistry} from "../src/AwardDistributionRegistry.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract Deploy is Script {
    function run() external returns (AwardDistributionRegistry registry, MockUSDC mockUSDC) {
        vm.startBroadcast();
        registry = new AwardDistributionRegistry();
        mockUSDC = new MockUSDC();
        vm.stopBroadcast();
    }
}
