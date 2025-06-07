// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import {TokenVault} from "../src/TokenVault.sol";
import {LegacyToken} from "../src/LegacyToken.sol";

contract TokenVaultTest is Test {
    LegacyToken token;
    TokenVault vault;
    address user = address(0x1);

    function setUp() public {
        token = new LegacyToken(1000 ether);
        vault = new TokenVault(address(token));
        token.transfer(user, 500 ether);
    }

    function testSendAndClaim() public {
        vm.startPrank(user);
        token.approve(address(vault), 100 ether);
        vault.sendTokens(100 ether);
        vm.stopPrank();

        assertEq(token.balanceOf(address(vault)), 100 ether);

        vault.claimTokens(50 ether);
        assertEq(token.balanceOf(address(vault)), 50 ether);
    }
}
