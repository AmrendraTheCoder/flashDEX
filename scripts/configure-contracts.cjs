const hre = require("hardhat");

// All deployed contracts on Monad Testnet
const CONTRACTS = {
  flashETH: "0x35895ffaBB85255232c3575137591277Fb1BC433",
  flashUSDT: "0xB52c6e73c071AB63B18b6bAF9604B84f0DD71081",
  flashBTC: "0xCEa63bF96B1F830bA950d478265e1bdde12063A9",
  flashFaucet: "0xa6E696983469b4D7bF80DEabec310840AAcb981F",
  flashOracle: "0xE7CFE8395735140A22a40430E6922334dCB37c55",
  flashVault: "0xeDc61C052e92935E07366b25B4D082AF16AC0476",
  orderBookV2: "0x6BD87ee70b9333474333680c846AFD2Ca65BC33c",
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Configuring contracts with account:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MON");
  console.log("---");

  // Get contract instances
  const flashVault = await hre.ethers.getContractAt("FlashVault", CONTRACTS.flashVault);
  const flashOracle = await hre.ethers.getContractAt("FlashOracle", CONTRACTS.flashOracle);

  // Add tokens to vault
  console.log("1. Adding tokens to vault...");
  await flashVault.addToken(CONTRACTS.flashETH);
  console.log("   Added FlashETH");
  await flashVault.addToken(CONTRACTS.flashUSDT);
  console.log("   Added FlashUSDT");
  await flashVault.addToken(CONTRACTS.flashBTC);
  console.log("   Added FlashBTC");

  // Configure oracle
  console.log("\n2. Configuring oracle price feeds...");
  await flashOracle.configureFeed("FETH/FUSDT", hre.ethers.ZeroAddress, 6, false);
  console.log("   Configured FETH/FUSDT");
  await flashOracle.configureFeed("FBTC/FUSDT", hre.ethers.ZeroAddress, 6, false);
  console.log("   Configured FBTC/FUSDT");
  await flashOracle.configureFeed("FETH/FBTC", hre.ethers.ZeroAddress, 8, false);
  console.log("   Configured FETH/FBTC");

  // Set initial prices
  console.log("\n3. Setting initial prices...");
  await flashOracle.setManualPrice("FETH/FUSDT", hre.ethers.parseUnits("2500", 6));
  console.log("   FETH/FUSDT = $2,500");
  await flashOracle.setManualPrice("FBTC/FUSDT", hre.ethers.parseUnits("45000", 6));
  console.log("   FBTC/FUSDT = $45,000");
  await flashOracle.setManualPrice("FETH/FBTC", hre.ethers.parseUnits("0.0556", 8));
  console.log("   FETH/FBTC = 0.0556");

  console.log("\n========================================");
  console.log("🎉 CONFIGURATION COMPLETE!");
  console.log("========================================");
  console.log("\nAll Contracts on Monad Testnet:");
  console.log(JSON.stringify(CONTRACTS, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Configuration failed:", error);
    process.exit(1);
  });
