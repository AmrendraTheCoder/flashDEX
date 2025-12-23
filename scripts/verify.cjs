const hre = require("hardhat");

/**
 * Verify deployed contracts on block explorer
 * Usage: npx hardhat run scripts/verify.cjs --network <network>
 * 
 * Update the addresses below with your deployed contract addresses
 */

const DEPLOYED_CONTRACTS = {
  flashETH: "0x...", // Update with deployed address
  flashUSDT: "0x...",
  flashBTC: "0x...",
  flashFaucet: "0x...",
  flashOracle: "0x...",
  flashVault: "0x...",
  orderBookV2: "0x...",
};

async function verifyContract(address, constructorArgs = []) {
  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments: constructorArgs,
    });
    console.log(`✅ Verified: ${address}`);
  } catch (error) {
    const errorMessage = error.message || String(error);
    if (errorMessage.includes("Already Verified")) {
      console.log(`⏭️  Already verified: ${address}`);
    } else {
      console.error(`❌ Failed to verify ${address}:`, errorMessage);
    }
  }
}

async function main() {
  console.log("Starting contract verification...\n");

  // Verify FlashTokens
  console.log("Verifying FlashETH...");
  await verifyContract(DEPLOYED_CONTRACTS.flashETH, ["Flash ETH", "FETH", 18]);

  console.log("Verifying FlashUSDT...");
  await verifyContract(DEPLOYED_CONTRACTS.flashUSDT, ["Flash USDT", "FUSDT", 6]);

  console.log("Verifying FlashBTC...");
  await verifyContract(DEPLOYED_CONTRACTS.flashBTC, ["Flash BTC", "FBTC", 8]);

  // Verify other contracts (no constructor args)
  console.log("Verifying FlashFaucet...");
  await verifyContract(DEPLOYED_CONTRACTS.flashFaucet);

  console.log("Verifying FlashOracle...");
  await verifyContract(DEPLOYED_CONTRACTS.flashOracle);

  console.log("Verifying FlashVault...");
  await verifyContract(DEPLOYED_CONTRACTS.flashVault);

  console.log("Verifying OrderBookV2...");
  await verifyContract(DEPLOYED_CONTRACTS.orderBookV2);

  console.log("\n✅ Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
