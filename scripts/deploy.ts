import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying ShadowDrop contracts with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const deployedAddresses: Record<string, string> = {};

  // ── 1. Deploy Mock ERC-20 (for testing) ─────────────────────────────────
  console.log("📦 Deploying MockERC20...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Shadow Test Token", "STT", 18);
  await mockToken.waitForDeployment();
  deployedAddresses.MockERC20 = await mockToken.getAddress();
  console.log("   ✅ MockERC20:", deployedAddresses.MockERC20);

  // ── 2. Deploy Wrapper Factory ────────────────────────────────────────────
  console.log("\n📦 Deploying ConfidentialWrapperFactory...");
  const Factory = await ethers.getContractFactory("ConfidentialWrapperFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  deployedAddresses.ConfidentialWrapperFactory = await factory.getAddress();
  console.log("   ✅ ConfidentialWrapperFactory:", deployedAddresses.ConfidentialWrapperFactory);

  // ── 3. Deploy first wrapper via Factory ──────────────────────────────────
  console.log("\n📦 Deploying first ConfidentialWrapper (for STT)...");
  const tx = await factory.deployWrapper(
    deployedAddresses.MockERC20,
    "Confidential Shadow Test Token",
    "cSTT",
    18
  );
  const receipt = await tx.wait();
  const wrapperAddress = await factory.wrapperOf(deployedAddresses.MockERC20);
  deployedAddresses.ConfidentialWrapper_STT = wrapperAddress;
  console.log("   ✅ ConfidentialWrapper (cSTT):", deployedAddresses.ConfidentialWrapper_STT);

  // ── 4. Deploy Airdrop Contract ───────────────────────────────────────────
  console.log("\n📦 Deploying ConfidentialAirdrop...");
  const Airdrop = await ethers.getContractFactory("ConfidentialAirdrop");
  const airdrop = await Airdrop.deploy();
  await airdrop.waitForDeployment();
  deployedAddresses.ConfidentialAirdrop = await airdrop.getAddress();
  console.log("   ✅ ConfidentialAirdrop:", deployedAddresses.ConfidentialAirdrop);

  // ── 5. Deploy Treasury Contract ──────────────────────────────────────────
  console.log("\n📦 Deploying ConfidentialTreasury...");
  const Treasury = await ethers.getContractFactory("ConfidentialTreasury");
  const treasury = await Treasury.deploy(deployedAddresses.ConfidentialWrapper_STT);
  await treasury.waitForDeployment();
  deployedAddresses.ConfidentialTreasury = await treasury.getAddress();
  console.log("   ✅ ConfidentialTreasury:", deployedAddresses.ConfidentialTreasury);

  // ── 6. Mint test tokens ──────────────────────────────────────────────────
  console.log("\n🪙  Minting 1,000,000 STT to deployer...");
  const mintTx = await mockToken.mint(deployer.address, ethers.parseEther("1000000"));
  await mintTx.wait();
  console.log("   ✅ Minted!");

  // ── 7. Save addresses to file ────────────────────────────────────────────
  const outputPath = path.join(__dirname, "..", "deployedAddresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(deployedAddresses, null, 2));
  console.log("\n📄 Addresses saved to deployedAddresses.json");

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════════════════════");
  console.log("🎉 ShadowDrop Deployment Complete!");
  console.log("════════════════════════════════════════════════════════════");
  Object.entries(deployedAddresses).forEach(([name, address]) => {
    console.log(`  ${name}: ${address}`);
  });
  console.log("\n📋 Next steps:");
  console.log("  1. Copy addresses to frontend/.env");
  console.log("  2. Run: npx hardhat run scripts/verify.ts --network sepolia");
  console.log("  3. Launch frontend: cd frontend && npm run dev");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Deployment failed:", err);
    process.exit(1);
  });
