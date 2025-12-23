const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("---");

  // ============ 1. Deploy FlashTokens ============
  console.log("1. Deploying FlashTokens...");
  
  const FlashToken = await hre.ethers.getContractFactory("FlashToken");
  
  // Flash ETH (18 decimals)
  const flashETH = await FlashToken.deploy("Flash ETH", "FETH", 18);
  await flashETH.waitForDeployment();
  console.log("   FlashETH deployed to:", await flashETH.getAddress());
  
  // Flash USDT (6 decimals like real USDT)
  const flashUSDT = await FlashToken.deploy("Flash USDT", "FUSDT", 6);
  await flashUSDT.waitForDeployment();
  console.log("   FlashUSDT deployed to:", await flashUSDT.getAddress());
  
  // Flash BTC (8 decimals like real BTC)
  const flashBTC = await FlashToken.deploy("Flash BTC", "FBTC", 8);
  await flashBTC.waitForDeployment();
  console.log("   FlashBTC deployed to:", await flashBTC.getAddress());

  // ============ 2. Deploy FlashFaucet ============
  console.log("\n2. Deploying FlashFaucet...");
  
  const FlashFaucet = await hre.ethers.getContractFactory("FlashFaucet");
  const flashFaucet = await FlashFaucet.deploy();
  await flashFaucet.waitForDeployment();
  console.log("   FlashFaucet deployed to:", await flashFaucet.getAddress());

  // ============ 3. Deploy FlashOracle ============
  console.log("\n3. Deploying FlashOracle...");
  
  const FlashOracle = await hre.ethers.getContractFactory("FlashOracle");
  const flashOracle = await FlashOracle.deploy();
  await flashOracle.waitForDeployment();
  console.log("   FlashOracle deployed to:", await flashOracle.getAddress());

  // ============ 4. Deploy FlashVault ============
  console.log("\n4. Deploying FlashVault...");
  
  const FlashVault = await hre.ethers.getContractFactory("FlashVault");
  const flashVault = await FlashVault.deploy();
  await flashVault.waitForDeployment();
  console.log("   FlashVault deployed to:", await flashVault.getAddress());

  // ============ 5. Deploy OrderBookV2 ============
  console.log("\n5. Deploying OrderBookV2...");
  
  const OrderBookV2 = await hre.ethers.getContractFactory("OrderBookV2");
  const orderBookV2 = await OrderBookV2.deploy();
  await orderBookV2.waitForDeployment();
  console.log("   OrderBookV2 deployed to:", await orderBookV2.getAddress());

  // ============ 6. Configure Contracts ============
  console.log("\n6. Configuring contracts...");

  // Set faucet address on tokens
  const faucetAddress = await flashFaucet.getAddress();
  await flashETH.setFaucet(faucetAddress);
  await flashUSDT.setFaucet(faucetAddress);
  await flashBTC.setFaucet(faucetAddress);
  console.log("   Set faucet on all tokens");

  // Add tokens to faucet with drip amounts
  // FETH: 10 tokens per claim
  await flashFaucet.addToken(await flashETH.getAddress(), hre.ethers.parseUnits("10", 18));
  // FUSDT: 10,000 tokens per claim
  await flashFaucet.addToken(await flashUSDT.getAddress(), hre.ethers.parseUnits("10000", 6));
  // FBTC: 0.5 tokens per claim
  await flashFaucet.addToken(await flashBTC.getAddress(), hre.ethers.parseUnits("0.5", 8));
  console.log("   Added tokens to faucet");

  // Add tokens to vault whitelist
  await flashVault.addToken(await flashETH.getAddress());
  await flashVault.addToken(await flashUSDT.getAddress());
  await flashVault.addToken(await flashBTC.getAddress());
  console.log("   Added tokens to vault whitelist");

  // Configure oracle price feeds (manual mode for testnet)
  await flashOracle.configureFeed("FETH/FUSDT", hre.ethers.ZeroAddress, 6, false);
  await flashOracle.configureFeed("FBTC/FUSDT", hre.ethers.ZeroAddress, 6, false);
  await flashOracle.configureFeed("FETH/FBTC", hre.ethers.ZeroAddress, 8, false);
  
  // Set initial prices
  await flashOracle.setManualPrice("FETH/FUSDT", hre.ethers.parseUnits("2500", 6)); // $2500
  await flashOracle.setManualPrice("FBTC/FUSDT", hre.ethers.parseUnits("45000", 6)); // $45000
  await flashOracle.setManualPrice("FETH/FBTC", hre.ethers.parseUnits("0.0556", 8)); // ~18 ETH per BTC
  console.log("   Configured oracle price feeds");

  // ============ Summary ============
  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  
  const contracts = {
    flashETH: await flashETH.getAddress(),
    flashUSDT: await flashUSDT.getAddress(),
    flashBTC: await flashBTC.getAddress(),
    flashFaucet: await flashFaucet.getAddress(),
    flashOracle: await flashOracle.getAddress(),
    flashVault: await flashVault.getAddress(),
    orderBookV2: await orderBookV2.getAddress(),
  };

  console.log("\nContract Addresses:");
  console.log(JSON.stringify(contracts, null, 2));

  console.log("\n========================================");
  console.log("NEXT STEPS:");
  console.log("1. Verify contracts: npx hardhat run scripts/verify.cjs --network <network>");
  console.log("2. Update frontend config with addresses");
  console.log("3. Grant OPERATOR_ROLE to matching engine");
  console.log("========================================");

  return contracts;
}

main()
  .then((contracts) => {
    console.log("\nDeployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
