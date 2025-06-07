// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {LegacyToken} from "../src/LegacyToken.sol";
import {TokenVault} from "../src/TokenVault.sol";

contract DeployScript is Script {
    function run() external {
        // Load your deployer's private key (from env vars or .env)
        // uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Broadcast everything inside this block as the deployer
        vm.startBroadcast();

        // Deploy ERC20 Token with 1,000 tokens
        LegacyToken token = new LegacyToken(1000 ether);
        console.log("Token deployed at:", address(token));

        // Deploy TokenVault
        TokenVault vault = new TokenVault(address(token));
        console.log("Vault deployed at:", address(vault));

        // Send some initial tokens to the vault from deployer
        token.transfer(address(vault), 200 ether);
        console.log("200 tokens transferred to the vault");

        vm.stopBroadcast();
    }
}
