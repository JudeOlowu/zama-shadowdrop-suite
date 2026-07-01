# 🔒 ShadowDrop Suite
Built for the **Zama Developer Program — Season 3**.

ShadowDrop is a three-module, privacy-focused DeFi application built using **Zama's FHEVM**. It brings fully homomorphic encryption (FHE) to token wrapping, private airdrops, and corporate/DAO treasury budgeting on-chain, proving that financial operations can run trustlessly without leaking sensitive data.

🌐 **GitHub Repository**: [JudeOlowu/zama-shadowdrop-suite](https://github.com/JudeOlowu/zama-shadowdrop-suite)
🎥 **Web Application**: Runs locally on `http://localhost:5173/`

---

## 🚀 Deployed Contract Addresses (Sepolia Testnet)

All smart contracts have been compiled, deployed, and fully verified on Etherscan Sepolia:

| Contract | Target Track | Address |
| --- | --- | --- |
| **MockERC20 (STT)** | Testing Faucet | [`0x25445a799729a204591B0e9DC833c6CBFCc27147`](https://sepolia.etherscan.io/address/0x25445a799729a204591B0e9DC833c6CBFCc27147#code) |
| **ConfidentialWrapperFactory** | Bounty Track | [`0x1CC3221F5CC32Ab97d98933d5061bCFa50b7AA7C`](https://sepolia.etherscan.io/address/0x1CC3221F5CC32Ab97d98933d5061bCFa50b7AA7C#code) |
| **ConfidentialWrapper (cSTT)** | Bounty Track | [`0x2D6fcC5928073630E5dDD34372Fa3c2D13F484B2`](https://sepolia.etherscan.io/address/0x2D6fcC5928073630E5dDD34372Fa3c2D13F484B2#code) |
| **ConfidentialAirdrop** | Special Bounty Track | [`0xD3089B6c200411bf2B334244af1c6F52d3c8f250`](https://sepolia.etherscan.io/address/0xD3089B6c200411bf2B334244af1c6F52d3c8f250#code) |
| **ConfidentialTreasury** | Builder Track | [`0x6C6965Ae42A0Ad8BAC8bF8422A33aFc104dDA15B`](https://sepolia.etherscan.io/address/0x6C6965Ae42A0Ad8BAC8bF8422A33aFc104dDA15B#code) |

---

## 🛠️ Modules Breakdown & FHE Architecture

### 🔄 1. Bounty Track: ERC-7984 Confidential Wrapper
- **Solidity File**: [`contracts/ConfidentialWrapper.sol`](./contracts/ConfidentialWrapper.sol)
- **Goal**: Implement the ERC-7984 standard to wrap public ERC-20 tokens into a shielded equivalent.
- **FHE Logic**: 
  - Balances are stored as Zama's `euint64` handles.
  - Public tokens are converted to confidential tokens via `wrap()`, which accepts a plaintext amount and adds it to the user's `euint64` balance using `TFHE.add`.
  - Shielded transactions transfer value from Sender to Recipient using encrypted handles. The amount transferred is completely hidden from the public ledger, executing homomorphic math with `TFHE.sub` and `TFHE.add`.
  - Safe decryption uses the `TFHE.allow` mechanism so that users can request signed re-encryption to display their own balance locally on the React frontend.

### 🪂 2. Special Bounty Track: Confidential Airdrop
- **Solidity File**: [`contracts/ConfidentialAirdrop.sol`](./contracts/ConfidentialAirdrop.sol)
- **Goal**: Conduct airdrops where participant wallets and exact reward weights remain secret to prevent front-running, market-dumping analysis, or privacy leaks.
- **FHE Logic**:
  - The creator submits an array of addresses and corresponding client-side encrypted allocations (`euint64[]`).
  - The airdrop weights are stored in the `allocations` mapping. Access is controlled via `TFHE.allow` which permits the specific recipient to query their allocation.
  - When the recipient claims, they invoke `claim()`. The contract checks validity via `TFHE.isAllowed(allocation, msg.sender)` and transfers the confidential tokens to their wallet securely.

### 🏛️ 3. Builder Track: Confidential Treasury Budgeting
- **Solidity File**: [`contracts/ConfidentialTreasury.sol`](./contracts/ConfidentialTreasury.sol)
- **Goal**: Enable corporate/DAO treasuries to allocate spending caps to operational members without revealing the organization's total balance, team limits, or individual payouts.
- **FHE Logic**:
  - Budgets are allocated using private `euint64` limits.
  - Members request expenses via `requestSpend()`. The contract checks if the requested amount is within their budget limits homomorphically. If valid, the math completes successfully; if the request exceeds the budget, the FHEVM operation fails/reverts, shielding the member's remaining allocation balance.

---

## 💻 Local Setup & Installation

### Root & Contracts
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment variables in `.env` (refer to `.env.example`):
   ```env
   PRIVATE_KEY=your_sepolia_private_key
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_alchemy_key
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```
3. Compile the contracts:
   ```bash
   npx hardhat compile
   ```

### React Frontend Dashboard
1. Navigate into the frontend:
   ```bash
   cd frontend
   ```
2. Install frontend packages:
   ```bash
   npm install
   ```
3. Copy environment variables in `frontend/.env` (configured with our Sepolia addresses).
4. Run the local development server:
   ```bash
   npm run dev
   ```
5. Connect your wallet to Sepolia and start wrapping tokens!
