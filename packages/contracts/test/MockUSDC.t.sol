// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MockUSDC} from "../src/MockUSDC.sol";

contract MockUSDCTest {
    function testApprovedSpenderCanTransferFromOwner() public {
        MockUSDC token = new MockUSDC();
        TokenSpenderProxy spender = new TokenSpenderProxy();

        token.mint(address(this), 1_000000);

        (bool approveSuccess,) = address(token)
            .call(abi.encodeWithSignature("approve(address,uint256)", address(spender), 400_000));
        require(approveSuccess, "approve failed");

        bool transferSuccess =
            spender.tryTransferFrom(token, address(this), address(0xB0B), 400_000);

        require(transferSuccess, "transferFrom failed");
        require(token.balanceOf(address(this)) == 600_000, "owner balance mismatch");
        require(token.balanceOf(address(0xB0B)) == 400_000, "recipient balance mismatch");
    }
}

contract TokenSpenderProxy {
    function tryTransferFrom(MockUSDC token, address from, address to, uint256 amount)
        external
        returns (bool)
    {
        (bool success, bytes memory data) = address(token)
            .call(
                abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
            );
        return success && (data.length == 0 || abi.decode(data, (bool)));
    }
}
