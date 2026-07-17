// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AwardDistributionRegistry} from "../src/AwardDistributionRegistry.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract Deploy {
    function create() external returns (AwardDistributionRegistry registry, MockUSDC mockUSDC) {
        registry = new AwardDistributionRegistry();
        mockUSDC = new MockUSDC();
    }
}
