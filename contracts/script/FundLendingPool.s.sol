// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockHeNGN.sol";

contract FundLendingPool is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("HEDERA_PRIVATE_KEY");
        address heNGNAddress = vm.envAddress("HENGN_TOKEN_ADDRESS");
        address poolAddress = vm.envAddress("LENDING_POOL_ADDRESS");
        
        console.log("Funding LendingPool with heNGN");
        console.log("heNGN:", heNGNAddress);
        console.log("Pool:", poolAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        MockHeNGN heNGN = MockHeNGN(heNGNAddress);
        uint256 fundAmount = 10_000_000 * 10**heNGN.decimals(); // 10M heNGN
        
        console.log("Minting", fundAmount / 10**heNGN.decimals(), "heNGN to pool...");
        heNGN.mint(poolAddress, fundAmount);
        
        uint256 poolBalance = heNGN.balanceOf(poolAddress);
        console.log("Pool balance:", poolBalance / 10**heNGN.decimals(), "heNGN");
        console.log("Pool funded successfully!");
        
        vm.stopBroadcast();
    }
}
