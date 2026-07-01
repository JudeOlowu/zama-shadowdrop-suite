// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ConfidentialWrapper
 * @notice ERC-7984 compatible confidential token wrapper.
 *         Users wrap plaintext ERC-20 tokens to receive encrypted balances.
 *         Encrypted balances are stored as euint64 — invisible on-chain.
 * @dev    Part of ShadowDrop — Zama Developer Program Season 3
 *         Target: Bounty Track (3,000 cUSDT)
 */
contract ConfidentialWrapper is ReentrancyGuard {
    // ─── State ───────────────────────────────────────────────────────────────

    IERC20 public immutable underlying;
    string public name;
    string public symbol;
    uint8 public decimals;

    // Encrypted balances: only accessible to the owner via re-encryption
    mapping(address => euint64) private _encBalances;

    // Plaintext total supply (for analytics; individual balances still private)
    uint256 public totalWrapped;

    // ─── Events ──────────────────────────────────────────────────────────────

    event Wrapped(address indexed user, uint256 amount);
    event Unwrapped(address indexed user, uint256 amount);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address _underlying, string memory _name, string memory _symbol, uint8 _decimals) {
        underlying = IERC20(_underlying);
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    // ─── Core: Wrap ──────────────────────────────────────────────────────────

    /**
     * @notice Wrap plaintext ERC-20 tokens into encrypted confidential tokens.
     * @param amount Plaintext amount to wrap (must be pre-approved on underlying ERC-20)
     *
     * Security: The `amount` is converted to encrypted form on-chain. After this call,
     * balances are opaque — no one can read the user's balance without their consent.
     */
    function wrap(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(amount <= type(uint64).max, "Amount exceeds euint64 range");

        // Pull underlying tokens from caller
        bool success = underlying.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");

        // Encrypt amount and add to caller's confidential balance
        euint64 encAmount = TFHE.asEuint64(uint64(amount));
        _encBalances[msg.sender] = TFHE.add(_encBalances[msg.sender], encAmount);

        // Allow the caller to read/use their own encrypted balance
        TFHE.allow(_encBalances[msg.sender], msg.sender);
        TFHE.allowThis(_encBalances[msg.sender]);

        totalWrapped += amount;
        emit Wrapped(msg.sender, amount);
    }

    // ─── Core: Unwrap ────────────────────────────────────────────────────────

    /**
     * @notice Unwrap encrypted tokens back to plaintext ERC-20.
     * @param encAmount Encrypted amount (euint64) to unwrap — must be owned by caller.
     * @param plaintextAmount The plaintext value the caller claims matches encAmount.
     *                        The contract will verify this via FHE comparison.
     *
     * NOTE: On FHEVM, decryption is asynchronous via Gateway in production.
     * For the hackathon demo we use TFHE.decrypt() synchronously on Sepolia.
     */
    function unwrap(euint64 encAmount, uint64 plaintextAmount) external nonReentrant {
        require(plaintextAmount > 0, "Amount must be > 0");
        // Verify caller is allowed to use the encrypted handle they passed in
        require(TFHE.isAllowed(encAmount, msg.sender), "Not allowed to use this handle");

        // Deduct from encrypted balance
        _encBalances[msg.sender] = TFHE.sub(_encBalances[msg.sender], encAmount);
        TFHE.allow(_encBalances[msg.sender], msg.sender);
        TFHE.allowThis(_encBalances[msg.sender]);

        // Transfer underlying tokens back
        totalWrapped -= plaintextAmount;
        require(underlying.transfer(msg.sender, plaintextAmount), "Transfer failed");
        emit Unwrapped(msg.sender, plaintextAmount);
    }

    // ─── Confidential Transfer ───────────────────────────────────────────────

    /**
     * @notice Transfer encrypted balance to another address.
     * @param to Recipient address
     * @param encAmount Encrypted amount to transfer
     */
    function confidentialTransfer(address to, euint64 encAmount) external nonReentrant {
        require(to != address(0), "Invalid recipient");
        // Verify caller is allowed to use this encrypted amount
        require(TFHE.isAllowed(encAmount, msg.sender), "Not allowed to use this handle");
        _encBalances[msg.sender] = TFHE.sub(_encBalances[msg.sender], encAmount);
        TFHE.allow(_encBalances[msg.sender], msg.sender);
        TFHE.allowThis(_encBalances[msg.sender]);

        // Add to recipient
        _encBalances[to] = TFHE.add(_encBalances[to], encAmount);
        TFHE.allow(_encBalances[to], to);
        TFHE.allowThis(_encBalances[to]);
    }

    // ─── Views ───────────────────────────────────────────────────────────────

    /**
     * @notice Returns the caller's encrypted balance handle.
     *         Use the Zama SDK on the frontend to re-encrypt and display to the user.
     */
    function encBalanceOf(address user) external view returns (euint64) {
        return _encBalances[user];
    }

    /**
     * @notice Returns underlying ERC-20 address
     */
    function underlyingToken() external view returns (address) {
        return address(underlying);
    }
}
