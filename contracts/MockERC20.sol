// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @notice Simple mintable ERC-20 for testing on Sepolia.
 *         Deploy this, mint tokens to yourself, then wrap them via ShadowDrop.
 */
contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimalsValue
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimalsValue;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Mint tokens to any address (only owner — for testing)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Public faucet — any address can mint up to 10,000 tokens for demo purposes
    function faucet() external {
        _mint(msg.sender, 10_000 * (10 ** _decimals));
    }
}
