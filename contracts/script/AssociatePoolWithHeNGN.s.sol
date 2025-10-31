// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/LendingPool.sol";

contract AssociatePoolWithHeNGN is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address poolAddress = vm.envAddress("LENDING_POOL_ADDRESS");

        console.log("Associating LendingPool with heNGN token");
        console.log("Pool Address:", poolAddress);

        vm.startBroadcast(deployerPrivateKey);

        LendingPool pool = LendingPool(poolAddress);
        pool.associateWithHeNGN();

        console.log("Successfully associated pool with heNGN!");

        vm.stopBroadcast();
    }
}
