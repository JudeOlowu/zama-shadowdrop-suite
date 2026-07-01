// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ConfidentialWrapper.sol";

/**
 * @title ConfidentialWrapperFactory
 * @notice Deploys and maintains a registry of ERC-7984 confidential token wrappers.
 *         Anyone can deploy a wrapper for any ERC-20 token that doesn't already have one.
 * @dev    Part of ShadowDrop — Zama Developer Program Season 3
 *         Target: Bounty Track (3,000 cUSDT)
 */
contract ConfidentialWrapperFactory is Ownable, ReentrancyGuard {
    // ─── State ───────────────────────────────────────────────────────────────

    // ERC-20 address → confidential wrapper address
    mapping(address => address) public wrapperOf;

    // All deployed wrappers
    address[] public allWrappers;

    // Metadata for each wrapper
    struct WrapperInfo {
        address erc20;
        address wrapper;
        string name;
        string symbol;
        uint8 decimals;
        address deployer;
        uint256 deployedAt;
    }

    WrapperInfo[] public wrapperRegistry;

    // ─── Events ──────────────────────────────────────────────────────────────

    event WrapperDeployed(
        address indexed erc20,
        address indexed wrapper,
        string name,
        string symbol,
        address deployer
    );

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── Core: Deploy Wrapper ────────────────────────────────────────────────

    /**
     * @notice Deploy a new confidential wrapper for any ERC-20 token.
     * @param erc20   Address of the underlying ERC-20 token.
     * @param name    Display name for the confidential token (e.g. "Confidential USDC").
     * @param symbol  Symbol for the confidential token (e.g. "cUSDC").
     * @param decimals Token decimals (should match underlying).
     * @return wrapper Address of the newly deployed ConfidentialWrapper.
     *
     * Requirements:
     * - No wrapper exists for this ERC-20 yet (one wrapper per token).
     * - erc20 must be a valid ERC-20 contract address.
     */
    function deployWrapper(
        address erc20,
        string memory name,
        string memory symbol,
        uint8 decimals
    ) external nonReentrant returns (address wrapper) {
        require(erc20 != address(0), "Invalid token address");
        require(wrapperOf[erc20] == address(0), "Wrapper already exists");
        require(bytes(name).length > 0, "Name required");
        require(bytes(symbol).length > 0, "Symbol required");

        // Deploy the wrapper
        ConfidentialWrapper newWrapper = new ConfidentialWrapper(erc20, name, symbol, decimals);
        wrapper = address(newWrapper);

        // Register
        wrapperOf[erc20] = wrapper;
        allWrappers.push(wrapper);

        wrapperRegistry.push(WrapperInfo({
            erc20: erc20,
            wrapper: wrapper,
            name: name,
            symbol: symbol,
            decimals: decimals,
            deployer: msg.sender,
            deployedAt: block.timestamp
        }));

        emit WrapperDeployed(erc20, wrapper, name, symbol, msg.sender);
    }

    // ─── Views ───────────────────────────────────────────────────────────────

    /// @notice Total number of wrappers deployed
    function totalWrappers() external view returns (uint256) {
        return allWrappers.length;
    }

    /// @notice Get all wrapper info structs (for frontend registry display)
    function getAllWrapperInfo() external view returns (WrapperInfo[] memory) {
        return wrapperRegistry;
    }

    /// @notice Get wrapper info by index
    function getWrapperInfo(uint256 index) external view returns (WrapperInfo memory) {
        require(index < wrapperRegistry.length, "Index out of bounds");
        return wrapperRegistry[index];
    }

    /// @notice Check if a wrapper exists for a given ERC-20
    function hasWrapper(address erc20) external view returns (bool) {
        return wrapperOf[erc20] != address(0);
    }
}
