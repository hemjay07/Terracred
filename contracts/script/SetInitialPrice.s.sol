// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
interface IPriceOracle { function updatePrice(address token, uint256 price) external; }
contract SetInitialPrice is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("HEDERA_PRIVATE_KEY");
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");
        address rwaTokenAddress = vm.envAddress("RWA_TOKEN_ADDRESS");
        vm.startBroadcast(deployerPrivateKey);
        IPriceOracle(oracleAddress).updatePrice(rwaTokenAddress, 50_000_000 * 10**18);
        console.log("Price set: 50M NGN for", rwaTokenAddress);
        vm.stopBroadcast();
    }
}
