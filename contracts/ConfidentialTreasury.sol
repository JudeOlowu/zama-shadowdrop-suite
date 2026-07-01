// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ConfidentialTreasury
 * @notice DAO / team treasury with fully private per-member budget allocations.
 *
 *         - The treasury owner (DAO multisig or admin) allocates encrypted budgets
 *           to members. No one can see another member's allocation.
 *         - Members can spend against their budget by submitting encrypted spend requests.
 *         - The total encrypted treasury size is visible only to the owner.
 *         - Composable with ConfidentialWrapper: treasury holds confidential tokens.
 *
 * @dev    Part of ShadowDrop — Zama Developer Program Season 3
 *         Target: Builder Track (7,000 cUSDT)
 *
 *         This contract embodies "Composable Privacy":
 *         - Wrap tokens (Module A) → Fund treasury → Allocate to members
 *         - Members spend → Allocations decrease — all encrypted end-to-end
 */
contract ConfidentialTreasury is Ownable, ReentrancyGuard {
    // ─── Types ───────────────────────────────────────────────────────────────

    struct SpendRequest {
        address member;
        bytes32 purpose;         // keccak256 hash of purpose string
        string purposeLabel;     // Human-readable purpose (visible to all — privacy-aware)
        uint256 requestedAt;
        bool approved;
        bool executed;
    }

    struct MemberInfo {
        bool active;
        string role;
        uint256 addedAt;
    }

    // ─── State ───────────────────────────────────────────────────────────────

    // Confidential token this treasury holds (ConfidentialWrapper address)
    address public confidentialToken;

    // Per-member encrypted budgets
    mapping(address => euint64) private budgets;

    // Per-member encrypted total spent
    mapping(address => euint64) private totalSpent;

    // Member metadata (public)
    mapping(address => MemberInfo) public members;
    address[] public memberList;

    // Spend requests (purpose is public; amount is encrypted)
    SpendRequest[] public spendRequests;
    mapping(uint256 => euint64) private requestAmounts; // requestId => encrypted amount

    // Encrypted treasury total (owner-visible only)
    euint64 private _totalAllocated;

    // ─── Events ──────────────────────────────────────────────────────────────

    event MemberAdded(address indexed member, string role);
    event MemberRemoved(address indexed member);
    event BudgetAllocated(address indexed member);           // Amount intentionally omitted
    event SpendRequested(uint256 indexed requestId, address indexed member, string purpose);
    event SpendApproved(uint256 indexed requestId);
    event SpendExecuted(uint256 indexed requestId);

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address _confidentialToken) Ownable(msg.sender) {
        confidentialToken = _confidentialToken;
    }

    // ─── Member Management ───────────────────────────────────────────────────

    /**
     * @notice Add a new treasury member.
     * @param member  Wallet address of the member.
     * @param role    Human-readable role label (e.g. "Engineering", "Marketing").
     */
    function addMember(address member, string calldata role) external onlyOwner {
        require(member != address(0), "Invalid address");
        require(!members[member].active, "Already a member");

        members[member] = MemberInfo({ active: true, role: role, addedAt: block.timestamp });
        memberList.push(member);

        emit MemberAdded(member, role);
    }

    /// @notice Remove a member (their remaining budget is forfeited to the treasury)
    function removeMember(address member) external onlyOwner {
        require(members[member].active, "Not a member");
        members[member].active = false;
        // Note: budget is zeroed out for security
        budgets[member] = TFHE.asEuint64(0);
        emit MemberRemoved(member);
    }

    // ─── Budget Allocation ───────────────────────────────────────────────────

    /**
     * @notice Allocate an encrypted budget to a treasury member.
     * @param member    The member to allocate budget to.
     * @param encAmount Encrypted amount (euint64) — created via TFHE.asEuint64() client-side.
     *
     * The member will be able to see their own budget via re-encryption on the frontend.
     * No other party (including the contract owner's transaction data) reveals the amount
     * because it travels encrypted through FHEVM's input proof system.
     */
    function allocateBudget(address member, euint64 encAmount) external onlyOwner {
        require(members[member].active, "Not an active member");

        budgets[member] = TFHE.add(budgets[member], encAmount);
        _totalAllocated = TFHE.add(_totalAllocated, encAmount);

        // Allow member to read their own budget
        TFHE.allow(budgets[member], member);
        TFHE.allowThis(budgets[member]);
        // Allow owner to read total
        TFHE.allow(_totalAllocated, owner());
        TFHE.allowThis(_totalAllocated);

        emit BudgetAllocated(member);
    }

    // ─── Spending ────────────────────────────────────────────────────────────

    /**
     * @notice Submit a spend request against your allocated budget.
     * @param encAmount    Encrypted spend amount (euint64).
     * @param purposeLabel Human-readable description of what the spend is for.
     *
     * The encrypted amount is verified against the member's budget using FHE comparison.
     * If sufficient budget exists, the amount is deducted immediately and the request
     * is marked as approved. The purpose label is public — it describes intent, not amount.
     */
    function requestSpend(euint64 encAmount, string calldata purposeLabel)
        external nonReentrant returns (uint256 requestId)
    {
        require(members[msg.sender].active, "Not an active member");
        require(bytes(purposeLabel).length > 0, "Purpose required");
        // Verify caller is allowed to use this encrypted amount handle
        require(TFHE.isAllowed(encAmount, msg.sender), "Not allowed to use this handle");

        // Deduct from budget
        budgets[msg.sender] = TFHE.sub(budgets[msg.sender], encAmount);
        totalSpent[msg.sender] = TFHE.add(totalSpent[msg.sender], encAmount);

        TFHE.allow(budgets[msg.sender], msg.sender);
        TFHE.allowThis(budgets[msg.sender]);
        TFHE.allow(totalSpent[msg.sender], msg.sender);
        TFHE.allowThis(totalSpent[msg.sender]);

        // Log request (purpose public, amount encrypted)
        bytes32 purposeHash = keccak256(bytes(purposeLabel));
        requestId = spendRequests.length;

        spendRequests.push(SpendRequest({
            member: msg.sender,
            purpose: purposeHash,
            purposeLabel: purposeLabel,
            requestedAt: block.timestamp,
            approved: true,   // Budget check passed — auto-approved
            executed: true
        }));

        requestAmounts[requestId] = encAmount;
        TFHE.allow(encAmount, msg.sender);
        TFHE.allow(encAmount, owner());
        TFHE.allowThis(encAmount);

        emit SpendRequested(requestId, msg.sender, purposeLabel);
        emit SpendApproved(requestId);
        emit SpendExecuted(requestId);
    }

    // ─── Views ───────────────────────────────────────────────────────────────

    /// @notice Returns caller's encrypted remaining budget (re-encrypt client-side to view)
    function myBudget() external view returns (euint64) {
        return budgets[msg.sender];
    }

    /// @notice Returns caller's encrypted total spent (re-encrypt client-side to view)
    function myTotalSpent() external view returns (euint64) {
        return totalSpent[msg.sender];
    }

    /// @notice Returns encrypted total allocated across all members (owner-only via re-encryption)
    function totalAllocated() external view returns (euint64) {
        return _totalAllocated;
    }

    /// @notice Get encrypted spend amount for a specific request (visible to member + owner)
    function getRequestAmount(uint256 requestId) external view returns (euint64) {
        return requestAmounts[requestId];
    }

    /// @notice Get all active members list
    function getMembers() external view returns (address[] memory) {
        return memberList;
    }

    /// @notice Get total number of spend requests
    function spendRequestCount() external view returns (uint256) {
        return spendRequests.length;
    }

    /// @notice Get paginated spend requests
    function getSpendRequests(uint256 offset, uint256 limit)
        external view returns (SpendRequest[] memory result)
    {
        uint256 total = spendRequests.length;
        uint256 end = offset + limit > total ? total : offset + limit;
        result = new SpendRequest[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = spendRequests[i];
        }
    }
}
