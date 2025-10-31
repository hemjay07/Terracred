// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PriceOracle.sol";

contract SetPriceTo1Naira is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");
        address masterRWATokenAddress = vm.envAddress("MASTER_RWA_TOKEN_ADDRESS");

        console.log("Setting oracle price to 1 Naira (100 kobo) per token...");
        console.log("Oracle:", oracleAddress);
        console.log("RWA Token:", masterRWATokenAddress);

        vm.startBroadcast(deployerPrivateKey);

        PriceOracle oracle = PriceOracle(oracleAddress);

        // Set price to 1 Naira = 100 kobo (heNGN has 2 decimals)
        uint256 newPrice = 100;

        oracle.updatePrice(masterRWATokenAddress, newPrice);

        console.log("Price set to:", newPrice, "kobo = 1 Naira per token");
        console.log("Now: 1 token = 1 Naira (N1)");
        console.log("Property N10M = 10,000,000 tokens");
        console.log("Property N10.25M = 10,250,000 tokens (all whole numbers!)");
        console.log("\nMax borrow for N10M property:", (newPrice * 10_000_000 * 6667) / 10000 / 100, "Naira");

        vm.stopBroadcast();
    }
}
