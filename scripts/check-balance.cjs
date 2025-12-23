const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(signer.address);
  
  console.log("=====================================");
  console.log("WALLET STATUS - MONAD TESTNET");
  console.log("=====================================");
  console.log("Address:", signer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "MON");
  console.log("=====================================");
  
  if (balance < hre.ethers.parseEther("0.5")) {
    console.log("\n⚠️  LOW BALANCE - Need ~0.5-1 MON for full deployment");
    console.log("Get testnet MON from: https://faucet.monad.xyz");
  } else {
    console.log("\n✅ Sufficient balance for deployment");
  }
}

main().catch(console.error);
