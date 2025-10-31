// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IHederaTokenService
 * @notice Interface for Hedera Token Service (HTS) precompile contract
 * @dev HTS precompile is located at address 0x0167
 * @dev Response code 22 indicates SUCCESS
 */
interface IHederaTokenService {
    /**
     * @notice Associates the calling contract with the specified token
     * @param account The contract address to associate
     * @param token The token address to associate with
     * @return responseCode The response code from HTS (22 = SUCCESS)
     */
    function associateToken(address account, address token) external returns (int32 responseCode);

    /**
     * @notice Associates the calling contract with multiple tokens
     * @param account The contract address to associate
     * @param tokens Array of token addresses to associate with
     * @return responseCode The response code from HTS (22 = SUCCESS)
     */
    function associateTokens(address account, address[] memory tokens) external returns (int32 responseCode);
}
