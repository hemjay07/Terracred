// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MockRWAToken.sol";

contract DeployMockRWA is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy mock RWA token with 10,000 tokens
        MockRWAToken rwaToken = new MockRWAToken(
            "Mock Real World Asset",
            "mRWA",
            10000  // 10,000 tokens with 0 decimals
        );

        console.log("MockRWAToken deployed at:", address(rwaToken));
        console.log("Initial supply: 10,000 tokens");
        console.log("");
        console.log("Add to .env:");
        console.log("RWA_TOKEN_ADDRESS=%s", address(rwaToken));

        vm.stopBroadcast();
    }
}
