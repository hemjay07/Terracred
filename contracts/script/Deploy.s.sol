// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/LendingPool.sol";
import "../src/PriceOracle.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        // FIXED: Use HENGN_TOKEN_ADDRESS instead of HENGN_ADDRESS
        address heNGN = vm.envAddress("HENGN_TOKEN_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        //deploy oracle
        PriceOracle oracle = new PriceOracle();
        console.log("Oracle deployed at:", address(oracle));

        //deploy lending pool with CORRECT heNGN
        LendingPool pool = new LendingPool(heNGN, address(oracle));
        console.log("LendingPool deployed at:", address(pool));
        console.log("Using heNGN at:", heNGN);

        vm.stopBroadcast();
    }
}
