const hre = require("hardhat");

// Already deployed contracts on Monad Testnet
const DEPLOYED = {
  flashETH: "0x35895ffaBB85255232c3575137591277Fb1BC433",
  flashUSDT: "0xB52c6e73c071AB63B18b6bAF9604B84f0DD71081",
  flashBTC: "0xCEa63bF96B1F830bA950d478265e1bdde12063A9",
  flashFaucet: "0xa6E696983469b4D7bF80DEabec310840AAcb981F",
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Continuing deployment with account:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MON");
  console.log("---");

  // ============ 1. Deploy FlashOracle ============
  console.log("1. Deploying FlashOracle...");
  const FlashOracle = await hre.ethers.getContractFactory("FlashOracle");
  const flashOracle = await FlashOracle.deploy();
  await flashOracle.waitForDeployment();
  console.log("   FlashOracle deployed to:", await flashOracle.getAddress());

  // ============ 2. Deploy FlashVault ============
  console.log("\n2. Deploying FlashVault...");
  const FlashVault = await hre.ethers.getContractFactory("FlashVault");
  const flashVault = await FlashVault.deploy();
  await flashVault.waitForDeployment();
  console.log("   FlashVault deployed to:", await flashVault.getAddress());

  // ============ 3. Deploy OrderBookV2 ============
  console.log("\n3. Deploying OrderBookV2...");
  const OrderBookV2 = await hre.ethers.getContractFactory("OrderBookV2");
  const orderBookV2 = await OrderBookV2.deploy();
  await orderBookV2.waitForDeployment();
  console.log("   OrderBookV2 deployed to:", await orderBookV2.getAddress());

  // ============ 4. Configure Contracts ============
  console.log("\n4. Configuring contracts...");

  // Get existing token contracts
  const flashETH = await hre.ethers.getContractAt("FlashToken", DEPLOYED.flashETH);
  const flashUSDT = await hre.ethers.getContractAt("FlashToken", DEPLOYED.flashUSDT);
  const flashBTC = await hre.ethers.getContractAt("FlashToken", DEPLOYED.flashBTC);
  const flashFaucet = await hre.ethers.getContractAt("FlashFaucet", DEPLOYED.flashFaucet);

  // Set faucet on tokens
  console.log("   Setting faucet on tokens...");
  await flashETH.setFaucet(DEPLOYED.flashFaucet);
  await flashUSDT.setFaucet(DEPLOYED.flashFaucet);
  await flashBTC.setFaucet(DEPLOYED.flashFaucet);

  // Add tokens to faucet
  console.log("   Adding tokens to faucet...");
  await flashFaucet.addToken(DEPLOYED.flashETH, hre.ethers.parseUnits("10", 18));
  await flashFaucet.addToken(DEPLOYED.flashUSDT, hre.ethers.parseUnits("10000", 6));
  await flashFaucet.addToken(DEPLOYED.flashBTC, hre.ethers.parseUnits("0.5", 8));

  // Add tokens to vault
  console.log("   Adding tokens to vault...");
  await flashVault.addToken(DEPLOYED.flashETH);
  await flashVault.addToken(DEPLOYED.flashUSDT);
  await flashVault.addToken(DEPLOYED.flashBTC);

  // Configure oracle
  console.log("   Configuring oracle...");
  await flashOracle.configureFeed("FETH/FUSDT", hre.ethers.ZeroAddress, 6, false);
  await flashOracle.configureFeed("FBTC/FUSDT", hre.ethers.ZeroAddress, 6, false);
  await flashOracle.configureFeed("FETH/FBTC", hre.ethers.ZeroAddress, 8, false);
  
  await flashOracle.setManualPrice("FETH/FUSDT", hre.ethers.parseUnits("2500", 6));
  await flashOracle.setManualPrice("FBTC/FUSDT", hre.ethers.parseUnits("45000", 6));
  await flashOracle.setManualPrice("FETH/FBTC", hre.ethers.parseUnits("0.0556", 8));

  // ============ Summary ============
  console.log("\n========================================");
  console.log("🎉 DEPLOYMENT COMPLETE - MONAD TESTNET");
  console.log("========================================");
  
  const contracts = {
    flashETH: DEPLOYED.flashETH,
    flashUSDT: DEPLOYED.flashUSDT,
    flashBTC: DEPLOYED.flashBTC,
    flashFaucet: DEPLOYED.flashFaucet,
    flashOracle: await flashOracle.getAddress(),
    flashVault: await flashVault.getAddress(),
    orderBookV2: await orderBookV2.getAddress(),
  };

  console.log("\nAll Contract Addresses:");
  console.log(JSON.stringify(contracts, null, 2));

  return contracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
