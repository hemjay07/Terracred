// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
contract MockHeNGN is ERC20, Ownable {
    uint8 private constant DECIMALS = 2;
    constructor() ERC20("Hedera Nigerian Naira", "heNGN") Ownable(msg.sender) {
        _mint(msg.sender, 100_000_000 * 10**DECIMALS);
    }
    function decimals() public pure override returns (uint8) { return DECIMALS; }
    function mint(address to, uint256 amount) external returns (bool) { _mint(to, amount); return true; }
    function burn(uint256 amount) external { _burn(msg.sender, amount); }
}
