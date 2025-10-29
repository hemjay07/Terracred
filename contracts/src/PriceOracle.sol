// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

error InvalidPrice();
error LengthMismatch();
error InvalidToken();
error Oracle__PriceNotSet(address token);
error Oracle__PriceStale(address token, uint256 lastUpdate, uint256 currentTime);


contract PriceOracle is Ownable {
    mapping(address => uint256) public prices;
    mapping(address => uint256) public lastUpdate;

    uint256 public constant MAX_PRICE_AGE = 1 days;

    event PriceUpdated(
        address indexed token, 
        uint256 price, 
        uint256 timestamp
    );

    constructor() Ownable(msg.sender) {}

    function updatePrice(address token, uint256 price) external onlyOwner {
        if (price == 0) revert InvalidPrice();
        prices[token] = price;
        lastUpdate[token] = block.timestamp;
        emit PriceUpdated(token, price, block.timestamp);
    }

    //update multiple prices
    function updatePrices(address[] calldata tokens, uint256[] calldata newPrices) external onlyOwner {
        if (tokens.length != newPrices.length) revert LengthMismatch();
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 price = newPrices[i];

            if (token == address(0)) revert InvalidToken();
            if (price == 0) revert InvalidPrice();

            prices[token] = price;
            lastUpdate[token] = block.timestamp;

            emit PriceUpdated(token, price, block.timestamp);
        }
    }

    function getPrice(address token) external view returns (uint256) {
        uint256 price = prices[token];
        if (price == 0) revert Oracle__PriceNotSet(token);

        uint256 last = lastUpdate[token];
        if (block.timestamp - last >= MAX_PRICE_AGE) {
            revert Oracle__PriceStale(token, last, block.timestamp);
        }
        return prices[token];
    }

    function isPriceStale(address token) external view returns (bool) {
        uint256 last = lastUpdate[token];
  
        if (block.timestamp - last >= MAX_PRICE_AGE) {
            revert Oracle__PriceStale(token, last, block.timestamp);
        }

        return false;
    }
}
