// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/LendingPool.sol";
import "../src/PriceOracle.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address heNGN = vm.envAddress("HENGN_TOKEN_ADDRESS");
        address masterRWA = vm.envAddress("MASTER_RWA_TOKEN_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy oracle
        PriceOracle oracle = new PriceOracle();
        console.log("Oracle deployed at:", address(oracle));

        // Deploy lending pool with auto-whitelisted master RWA token
        LendingPool pool = new LendingPool(heNGN, address(oracle), masterRWA);
        console.log("LendingPool deployed at:", address(pool));
        console.log("Using heNGN at:", heNGN);
        console.log("Master RWA token auto-whitelisted:", masterRWA);

        vm.stopBroadcast();
    }
}
