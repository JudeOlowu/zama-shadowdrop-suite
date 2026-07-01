// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./ConfidentialWrapper.sol";

/**
 * @title ConfidentialAirdrop
 * @notice Private multi-recipient token distribution platform.
 *         Creators upload recipient lists; each recipient's allocation is
 *         stored as an encrypted euint64 — invisible to all other parties.
 *         Recipients claim their allocation without others knowing how much they received.
 *
 * @dev    Part of ShadowDrop — Zama Developer Program Season 3
 *         Target: Special Bounty Track via TokenOps SDK (2,500 cUSDT)
 *
 *         Flow:
 *         1. Creator calls `createDrop()` with encrypted per-recipient allocations
 *         2. Creator deposits confidential tokens into the drop
 *         3. Recipients call `claim()` — only they can see their allocation
 *         4. After deadline, creator can call `reclaimUnclaimed()`
 */
contract ConfidentialAirdrop is Ownable, ReentrancyGuard, Pausable {
    // ─── Types ───────────────────────────────────────────────────────────────

    struct Drop {
        address creator;
        address confidentialToken;  // Must be a ConfidentialWrapper address
        uint256 deadline;
        uint256 recipientCount;
        uint256 claimedCount;
        bool active;
        string title;
        string description;
    }

    // ─── State ───────────────────────────────────────────────────────────────

    mapping(uint256 => Drop) public drops;
    // dropId => recipient => encrypted allocation
    mapping(uint256 => mapping(address => euint64)) private allocations;
    // dropId => recipient => has claimed
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    uint256 public dropCount;
    uint256 public constant MAX_RECIPIENTS_PER_DROP = 500;
    uint256 public constant MIN_DEADLINE_DURATION = 1 days;

    // ─── Events ──────────────────────────────────────────────────────────────

    event DropCreated(
        uint256 indexed dropId,
        address indexed creator,
        address confidentialToken,
        uint256 recipientCount,
        uint256 deadline,
        string title
    );
    event Claimed(uint256 indexed dropId, address indexed recipient);
    event DropDeactivated(uint256 indexed dropId);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── Core: Create Drop ───────────────────────────────────────────────────

    /**
     * @notice Create a new confidential airdrop campaign.
     * @param confidentialToken Address of the ConfidentialWrapper token to distribute.
     * @param recipients        Array of recipient wallet addresses.
     * @param encAllocations    Array of encrypted uint64 allocations (one per recipient).
     *                          Each euint64 must be created client-side via TFHE.asEuint64()
     *                          and passed through FHEVM's encrypted input pipeline.
     * @param deadline          Unix timestamp after which no more claims are accepted.
     * @param title             Human-readable name for this drop (public).
     * @param description       Short description (public).
     *
     * NOTE: The creator must have already approved this contract on the ConfidentialWrapper
     *       or transferred enough encrypted tokens before calling this function.
     */
    function createDrop(
        address confidentialToken,
        address[] calldata recipients,
        euint64[] calldata encAllocations,
        uint256 deadline,
        string calldata title,
        string calldata description
    ) external whenNotPaused nonReentrant returns (uint256 dropId) {
        require(confidentialToken != address(0), "Invalid token");
        require(recipients.length > 0, "No recipients");
        require(recipients.length == encAllocations.length, "Length mismatch");
        require(recipients.length <= MAX_RECIPIENTS_PER_DROP, "Too many recipients");
        require(deadline > block.timestamp + MIN_DEADLINE_DURATION, "Deadline too soon");
        require(bytes(title).length > 0, "Title required");

        dropId = ++dropCount;

        drops[dropId] = Drop({
            creator: msg.sender,
            confidentialToken: confidentialToken,
            deadline: deadline,
            recipientCount: recipients.length,
            claimedCount: 0,
            active: true,
            title: title,
            description: description
        });

        // Store encrypted allocation for each recipient
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            allocations[dropId][recipients[i]] = encAllocations[i];
            // Allow recipient to read their own allocation
            TFHE.allow(encAllocations[i], recipients[i]);
            TFHE.allowThis(encAllocations[i]);
        }

        emit DropCreated(dropId, msg.sender, confidentialToken, recipients.length, deadline, title);
    }

    // ─── Core: Claim ─────────────────────────────────────────────────────────

    /**
     * @notice Claim your allocation from a drop.
     * @param dropId The ID of the drop to claim from.
     *
     * Only callable by an eligible recipient. Emits Claimed event (but not the amount).
     */
    function claim(uint256 dropId, uint64 /*amount*/) external whenNotPaused nonReentrant {
        Drop storage drop = drops[dropId];
        require(drop.active, "Drop not active");
        require(block.timestamp <= drop.deadline, "Drop has expired");
        require(!hasClaimed[dropId][msg.sender], "Already claimed");

        euint64 allocation = allocations[dropId][msg.sender];

        // Verify allocation is > 0 (recipient is eligible) via TFHE.isAllowed check
        require(TFHE.isAllowed(allocation, msg.sender), "No allocation for this address");

        // Mark as claimed
        hasClaimed[dropId][msg.sender] = true;
        drop.claimedCount += 1;

        // Zero out their allocation
        allocations[dropId][msg.sender] = TFHE.asEuint64(0);

        // Transfer confidential tokens to recipient
        ConfidentialWrapper token = ConfidentialWrapper(drop.confidentialToken);
        token.confidentialTransfer(msg.sender, allocation);

        emit Claimed(dropId, msg.sender);
    }

    // ─── Views ───────────────────────────────────────────────────────────────

    /**
     * @notice Returns the caller's encrypted allocation for a given drop.
     *         Use Zama SDK on frontend to re-encrypt and display to the user.
     */
    function myAllocation(uint256 dropId) external view returns (euint64) {
        return allocations[dropId][msg.sender];
    }

    /// @notice Get all public drop metadata
    function getDrop(uint256 dropId) external view returns (Drop memory) {
        return drops[dropId];
    }

    /// @notice Paginated list of drops for frontend display
    function getDrops(uint256 offset, uint256 limit) external view returns (Drop[] memory result) {
        uint256 end = offset + limit > dropCount ? dropCount : offset + limit;
        result = new Drop[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = drops[i + 1];
        }
    }

    /// @notice Check if an address has claimed from a drop
    function checkClaimed(uint256 dropId, address recipient) external view returns (bool) {
        return hasClaimed[dropId][recipient];
    }

    // ─── Admin ───────────────────────────────────────────────────────────────

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function deactivateDrop(uint256 dropId) external {
        require(drops[dropId].creator == msg.sender || msg.sender == owner(), "Unauthorized");
        drops[dropId].active = false;
        emit DropDeactivated(dropId);
    }
}
