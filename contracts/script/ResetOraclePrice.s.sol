// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PriceOracle.sol";

contract ResetOraclePrice is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");
        address masterRWATokenAddress = vm.envAddress("MASTER_RWA_TOKEN_ADDRESS");

        console.log("Resetting oracle price to production value...");
        console.log("Oracle:", oracleAddress);
        console.log("RWA Token:", masterRWATokenAddress);

        vm.startBroadcast(deployerPrivateKey);

        PriceOracle oracle = PriceOracle(oracleAddress);

        // Set price to 400,000 Naira (40,000,000 kobo with 2 decimals)
        uint256 productionPrice = 40_000_000;

        oracle.updatePrice(masterRWATokenAddress, productionPrice);

        console.log("Price set to:", productionPrice, "kobo = 400,000 Naira");
        console.log("Max borrow with 1000 tokens:", (productionPrice * 1000 * 6667) / 10000 / 100, "Naira");

        vm.stopBroadcast();
    }
}
