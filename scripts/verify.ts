import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const addressFile = path.join(__dirname, "..", "deployedAddresses.json");
  if (!fs.existsSync(addressFile)) {
    throw new Error("deployedAddresses.json not found. Run deploy.ts first.");
  }

  const addresses = JSON.parse(fs.readFileSync(addressFile, "utf8"));

  console.log("🔍 Verifying contracts on Etherscan Sepolia...\n");

  const verifyMap = [
    {
      name: "MockERC20",
      address: addresses.MockERC20,
      constructorArguments: ["Shadow Test Token", "STT", 18],
    },
    {
      name: "ConfidentialWrapperFactory",
      address: addresses.ConfidentialWrapperFactory,
      constructorArguments: [],
    },
    {
      name: "ConfidentialWrapper (cSTT)",
      address: addresses.ConfidentialWrapper_STT,
      constructorArguments: [addresses.MockERC20, "Confidential Shadow Test Token", "cSTT", 18],
    },
    {
      name: "ConfidentialAirdrop",
      address: addresses.ConfidentialAirdrop,
      constructorArguments: [],
    },
    {
      name: "ConfidentialTreasury",
      address: addresses.ConfidentialTreasury,
      constructorArguments: [addresses.ConfidentialWrapper_STT],
    },
  ];

  for (const contract of verifyMap) {
    try {
      console.log(`Verifying ${contract.name} at ${contract.address}...`);
      await run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArguments,
      });
      console.log(`  ✅ ${contract.name} verified!\n`);
    } catch (err: any) {
      if (err.message.includes("Already Verified")) {
        console.log(`  ℹ️  ${contract.name} already verified.\n`);
      } else {
        console.error(`  ❌ ${contract.name} verification failed:`, err.message, "\n");
      }
    }
  }

  console.log("🎉 Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
