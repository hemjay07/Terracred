// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import "../src/MockHeNGN.sol";
contract DeployMockHeNGN is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("HEDERA_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        MockHeNGN heNGN = new MockHeNGN();
        console.log("Address:", address(heNGN));
        console.log("Add to .env: HENGN_TOKEN_ADDRESS=%s", address(heNGN));
        vm.stopBroadcast();
    }
}
