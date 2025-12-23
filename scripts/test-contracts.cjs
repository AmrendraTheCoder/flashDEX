/**
 * Test script to verify all contracts are working on Monad Testnet
 * Run: npx hardhat run scripts/test-contracts.cjs --network monadTestnet
 */
const hre = require("hardhat");

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
  const [signer] = await hre.ethers.getSigners();
  console.log("Testing contracts with account:", signer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(signer.address)), "MON");
  console.log("\n========================================");
  console.log("CONTRACT STATUS CHECK");
  console.log("========================================\n");

  let allPassed = true;

  // Test 1: FlashToken (FETH)
  try {
    const feth = await hre.ethers.getContractAt("FlashToken", CONTRACTS.flashETH);
    const symbol = await feth.symbol();
    const decimals = await feth.decimals();
    const balance = await feth.balanceOf(signer.address);
    console.log(`✅ FlashETH: ${symbol}, ${decimals} decimals, Balance: ${hre.ethers.formatUnits(balance, decimals)}`);
  } catch (e) {
    console.log(`❌ FlashETH: ${e.message}`);
    allPassed = false;
  }

  // Test 2: FlashToken (FUSDT)
  try {
    const fusdt = await hre.ethers.getContractAt("FlashToken", CONTRACTS.flashUSDT);
    const symbol = await fusdt.symbol();
    const decimals = await fusdt.decimals();
    const balance = await fusdt.balanceOf(signer.address);
    console.log(`✅ FlashUSDT: ${symbol}, ${decimals} decimals, Balance: ${hre.ethers.formatUnits(balance, decimals)}`);
  } catch (e) {
    console.log(`❌ FlashUSDT: ${e.message}`);
    allPassed = false;
  }

  // Test 3: FlashToken (FBTC)
  try {
    const fbtc = await hre.ethers.getContractAt("FlashToken", CONTRACTS.flashBTC);
    const symbol = await fbtc.symbol();
    const decimals = await fbtc.decimals();
    const balance = await fbtc.balanceOf(signer.address);
    console.log(`✅ FlashBTC: ${symbol}, ${decimals} decimals, Balance: ${hre.ethers.formatUnits(balance, decimals)}`);
  } catch (e) {
    console.log(`❌ FlashBTC: ${e.message}`);
    allPassed = false;
  }

  // Test 4: FlashFaucet
  try {
    const faucet = await hre.ethers.getContractAt("FlashFaucet", CONTRACTS.flashFaucet);
    const canClaim = await faucet.canClaim(signer.address);
    const tokenCount = await faucet.tokenCount();
    console.log(`✅ FlashFaucet: ${tokenCount} tokens configured, canClaim: ${canClaim}`);
  } catch (e) {
    console.log(`❌ FlashFaucet: ${e.message}`);
    allPassed = false;
  }

  // Test 5: FlashOracle
  try {
    const oracle = await hre.ethers.getContractAt("FlashOracle", CONTRACTS.flashOracle);
    const [ethPrice] = await oracle.getPrice("FETH/FUSDT");
    const [btcPrice] = await oracle.getPrice("FBTC/FUSDT");
    console.log(`✅ FlashOracle: FETH=$${hre.ethers.formatUnits(ethPrice, 6)}, FBTC=$${hre.ethers.formatUnits(btcPrice, 6)}`);
  } catch (e) {
    console.log(`❌ FlashOracle: ${e.message}`);
    allPassed = false;
  }

  // Test 6: FlashVault
  try {
    const vault = await hre.ethers.getContractAt("FlashVault", CONTRACTS.flashVault);
    const tokenCount = await vault.tokenCount();
    const fethSupported = await vault.supportedTokens(CONTRACTS.flashETH);
    console.log(`✅ FlashVault: ${tokenCount} tokens supported, FETH supported: ${fethSupported}`);
  } catch (e) {
    console.log(`❌ FlashVault: ${e.message}`);
    allPassed = false;
  }

  // Test 7: OrderBookV2
  try {
    const orderBook = await hre.ethers.getContractAt("OrderBookV2", CONTRACTS.orderBookV2);
    const stats = await orderBook.getStats();
    console.log(`✅ OrderBookV2: Volume=${stats._totalVolume}, Trades=${stats._totalTrades}`);
  } catch (e) {
    console.log(`❌ OrderBookV2: ${e.message}`);
    allPassed = false;
  }

  console.log("\n========================================");
  if (allPassed) {
    console.log("✅ ALL CONTRACTS WORKING!");
  } else {
    console.log("⚠️  SOME CONTRACTS HAVE ISSUES");
  }
  console.log("========================================");

  // Summary
  console.log("\n📋 Contract Addresses:");
  Object.entries(CONTRACTS).forEach(([name, addr]) => {
    console.log(`   ${name}: ${addr}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
