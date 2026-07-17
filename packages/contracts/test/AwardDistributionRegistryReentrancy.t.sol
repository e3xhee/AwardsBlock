// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AwardDistributionRegistry} from "../src/AwardDistributionRegistry.sol";

contract AwardDistributionRegistryReentrancyTest {
    function testFundAwardBlocksReentrantFundingAttempt() public {
        AwardDistributionRegistry registry = new AwardDistributionRegistry();
        ReentrantFundingToken token = new ReentrantFundingToken();
        bytes32 awardId = keccak256("award-reentrant-fund");
        uint256 amount = 1_000_000000;

        token.prepareReadyAward(registry, awardId, amount);
        token.enableReentrantFunding();

        bool outerFundSuccess = token.tryFundAward(amount);

        require(outerFundSuccess, "outer fund failed");
        require(!token.reentrantFundSucceeded(), "reentrant fund succeeded");
    }
}

contract ReentrantFundingToken {
    string public constant name = "ReentrantFundingToken";
    string public constant symbol = "RFT";
    uint8 public constant decimals = 6;

    mapping(address => uint256) public balanceOf;

    AwardDistributionRegistry private registry;
    bytes32 private awardId;
    bool private reentrantFundingEnabled;
    bool private reentrantFundingAttempted;
    bool public reentrantFundSucceeded;

    event Transfer(address indexed from, address indexed to, uint256 amount);

    function prepareReadyAward(
        AwardDistributionRegistry targetRegistry,
        bytes32 targetAwardId,
        uint256 amount
    ) external {
        registry = targetRegistry;
        awardId = targetAwardId;
        balanceOf[address(this)] = amount;

        registry.createAward(
            awardId,
            keccak256("event-reentrant"),
            keccak256("project-reentrant"),
            "https://awardblock.local/metadata/reentrant.json",
            keccak256("metadata-reentrant"),
            address(this),
            uint64(block.timestamp),
            uint64(block.timestamp + 8 days)
        );

        address[] memory recipients = new address[](1);
        recipients[0] = address(0xA11CE);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        registry.setRecipients(awardId, recipients, amounts);
    }

    function enableReentrantFunding() external {
        reentrantFundingEnabled = true;
    }

    function tryFundAward(uint256 amount) external returns (bool) {
        (bool success,) =
            address(registry).call(abi.encodeCall(registry.fundAward, (awardId, amount)));
        return success;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "INSUFFICIENT_BALANCE");

        if (reentrantFundingEnabled && !reentrantFundingAttempted) {
            reentrantFundingAttempted = true;
            (bool success,) =
                address(registry).call(abi.encodeCall(registry.fundAward, (awardId, 0)));
            reentrantFundSucceeded = success;
        }

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "INSUFFICIENT_BALANCE");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}
