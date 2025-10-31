// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockHeNGN.sol";

contract DeployHeNGNAndFundPool is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address poolAddress = vm.envAddress("LENDING_POOL_ADDRESS");

        console.log("Deploying new heNGN and funding pool...");
        console.log("Pool:", poolAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new heNGN (deployer will be owner)
        MockHeNGN heNGN = new MockHeNGN();

        console.log("heNGN deployed at:", address(heNGN));
        console.log("Decimals:", heNGN.decimals());

        // Mint 1 billion heNGN (10M Naira) to pool
        // 10,000,000 Naira * 100 kobo = 1,000,000,000 heNGN
        // With 2 decimals: 1,000,000,000 * 100 = 100,000,000,000
        uint256 poolFunding = 100_000_000_000; // 1B heNGN = 10M Naira

        heNGN.mint(poolAddress, poolFunding);

        console.log("Minted to pool:", poolFunding / 100, "heNGN");
        console.log("In Naira:", poolFunding / 100 / 100, "NGN");
        console.log("Pool balance:", heNGN.balanceOf(poolAddress) / 100, "heNGN");

        vm.stopBroadcast();

        console.log("\n=== NEXT STEPS ===");
        console.log("1. Update HENGN_TOKEN_ADDRESS in all .env files");
        console.log("2. Associate LendingPool with new heNGN");
        console.log("3. Update oracle price back to 400k");
    }
}
