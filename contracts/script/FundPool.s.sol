// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import "../src/MockHeNGN.sol";

contract FundPool is Script {
    function run() external {
        // Load environment variables
        address heNGNAddress = vm.envAddress("HENGN_TOKEN_ADDRESS");
        address poolAddress = vm.envAddress("LENDING_POOL_ADDRESS");
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        console.log("=== Funding Lending Pool with heNGN ===");
        console.log("heNGN Address:", heNGNAddress);
        console.log("Pool Address:", poolAddress);

        // Amount to mint: 410 million heNGN (2 decimals)
        uint256 amount = 410_000_000 * 100; // 410M heNGN in kobo

        vm.startBroadcast(deployerPrivateKey);

        MockHeNGN heNGN = MockHeNGN(heNGNAddress);

        console.log("\nMinting", amount / 100, "heNGN to lending pool...");
        heNGN.mint(poolAddress, amount);

        console.log("SUCCESS! Pool funded with 410M heNGN");
        console.log("Pool balance:", heNGN.balanceOf(poolAddress) / 100, "heNGN");

        vm.stopBroadcast();
    }
}
