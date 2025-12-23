const { expect } = require("chai");
const hre = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("FlashDEX Contracts", function () {
  async function deployFixture() {
    const [owner, user1, user2, operator] = await hre.ethers.getSigners();

    // Deploy tokens
    const FlashToken = await hre.ethers.getContractFactory("FlashToken");
    const flashETH = await FlashToken.deploy("Flash ETH", "FETH", 18);
    const flashUSDT = await FlashToken.deploy("Flash USDT", "FUSDT", 6);

    // Deploy faucet
    const FlashFaucet = await hre.ethers.getContractFactory("FlashFaucet");
    const faucet = await FlashFaucet.deploy();

    // Deploy oracle
    const FlashOracle = await hre.ethers.getContractFactory("FlashOracle");
    const oracle = await FlashOracle.deploy();

    // Deploy vault
    const FlashVault = await hre.ethers.getContractFactory("FlashVault");
    const vault = await FlashVault.deploy();

    // Deploy order book
    const OrderBookV2 = await hre.ethers.getContractFactory("OrderBookV2");
    const orderBook = await OrderBookV2.deploy();

    // Configure
    await flashETH.setFaucet(await faucet.getAddress());
    await flashUSDT.setFaucet(await faucet.getAddress());
    await faucet.addToken(await flashETH.getAddress(), hre.ethers.parseUnits("10", 18));
    await faucet.addToken(await flashUSDT.getAddress(), hre.ethers.parseUnits("10000", 6));
    await vault.addToken(await flashETH.getAddress());
    await vault.addToken(await flashUSDT.getAddress());

    return { flashETH, flashUSDT, faucet, oracle, vault, orderBook, owner, user1, user2, operator };
  }

  describe("FlashToken", function () {
    it("Should have correct decimals", async function () {
      const { flashETH, flashUSDT } = await loadFixture(deployFixture);
      expect(await flashETH.decimals()).to.equal(18);
      expect(await flashUSDT.decimals()).to.equal(6);
    });

    it("Should allow faucet to mint", async function () {
      const { flashETH, faucet, user1 } = await loadFixture(deployFixture);
      await faucet.connect(user1).claim();
      expect(await flashETH.balanceOf(user1.address)).to.equal(hre.ethers.parseUnits("10", 18));
    });

    it("Should reject unauthorized minting", async function () {
      const { flashETH, user1 } = await loadFixture(deployFixture);
      await expect(flashETH.connect(user1).mint(user1.address, 1000))
        .to.be.revertedWithCustomError(flashETH, "Unauthorized");
    });
  });

  describe("FlashFaucet", function () {
    it("Should enforce cooldown", async function () {
      const { faucet, user1 } = await loadFixture(deployFixture);
      await faucet.connect(user1).claim();
      await expect(faucet.connect(user1).claim())
        .to.be.revertedWithCustomError(faucet, "CooldownNotExpired");
    });

    it("Should allow claim after cooldown", async function () {
      const { faucet, flashETH, user1 } = await loadFixture(deployFixture);
      await faucet.connect(user1).claim();
      
      // Fast forward 24 hours
      await time.increase(24 * 60 * 60);
      
      await faucet.connect(user1).claim();
      expect(await flashETH.balanceOf(user1.address)).to.equal(hre.ethers.parseUnits("20", 18));
    });

    it("Should report correct time until claim", async function () {
      const { faucet, user1 } = await loadFixture(deployFixture);
      expect(await faucet.timeUntilClaim(user1.address)).to.equal(0);
      
      await faucet.connect(user1).claim();
      const remaining = await faucet.timeUntilClaim(user1.address);
      expect(remaining).to.be.closeTo(24 * 60 * 60, 5);
    });
  });

  describe("FlashOracle", function () {
    it("Should set and get manual prices", async function () {
      const { oracle } = await loadFixture(deployFixture);
      
      await oracle.configureFeed("ETH/USDT", hre.ethers.ZeroAddress, 6, false);
      await oracle.setManualPrice("ETH/USDT", hre.ethers.parseUnits("2500", 6));
      
      const [price] = await oracle.getPrice("ETH/USDT");
      expect(price).to.equal(hre.ethers.parseUnits("2500", 6));
    });

    it("Should batch update prices", async function () {
      const { oracle } = await loadFixture(deployFixture);
      
      await oracle.configureFeed("ETH/USDT", hre.ethers.ZeroAddress, 6, false);
      await oracle.configureFeed("BTC/USDT", hre.ethers.ZeroAddress, 6, false);
      
      await oracle.batchSetManualPrices(
        ["ETH/USDT", "BTC/USDT"],
        [hre.ethers.parseUnits("2500", 6), hre.ethers.parseUnits("45000", 6)]
      );
      
      const [ethPrice] = await oracle.getPrice("ETH/USDT");
      const [btcPrice] = await oracle.getPrice("BTC/USDT");
      
      expect(ethPrice).to.equal(hre.ethers.parseUnits("2500", 6));
      expect(btcPrice).to.equal(hre.ethers.parseUnits("45000", 6));
    });
  });

  describe("FlashVault", function () {
    it("Should handle deposits and withdrawals", async function () {
      const { vault, flashETH, faucet, user1 } = await loadFixture(deployFixture);
      
      // Get tokens from faucet
      await faucet.connect(user1).claim();
      
      // Approve and deposit
      const depositAmount = hre.ethers.parseUnits("5", 18);
      await flashETH.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(await flashETH.getAddress(), depositAmount);
      
      expect(await vault.getBalance(await flashETH.getAddress(), user1.address))
        .to.equal(depositAmount);
      
      // Withdraw
      await vault.connect(user1).withdraw(await flashETH.getAddress(), depositAmount);
      expect(await vault.getBalance(await flashETH.getAddress(), user1.address))
        .to.equal(0);
    });

    it("Should settle trades correctly", async function () {
      const { vault, flashETH, flashUSDT, faucet, owner, user1, user2 } = await loadFixture(deployFixture);
      
      // Setup: user1 has ETH, user2 has USDT
      await faucet.connect(user1).claim();
      await faucet.connect(user2).claim();
      
      const ethAmount = hre.ethers.parseUnits("1", 18);
      const usdtAmount = hre.ethers.parseUnits("2500", 6);
      
      // Deposit to vault
      await flashETH.connect(user1).approve(await vault.getAddress(), ethAmount);
      await vault.connect(user1).deposit(await flashETH.getAddress(), ethAmount);
      
      await flashUSDT.connect(user2).approve(await vault.getAddress(), usdtAmount);
      await vault.connect(user2).deposit(await flashUSDT.getAddress(), usdtAmount);
      
      // Settle trade (user2 buys 1 ETH for 2500 USDT)
      const tradeId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("trade1"));
      await vault.settleSingleTrade(
        tradeId,
        user2.address, // buyer
        user1.address, // seller
        await flashETH.getAddress(),
        await flashUSDT.getAddress(),
        ethAmount,
        usdtAmount,
        hre.ethers.parseUnits("2500", 6)
      );
      
      // Verify balances
      expect(await vault.getBalance(await flashETH.getAddress(), user2.address))
        .to.equal(ethAmount);
      expect(await vault.getBalance(await flashUSDT.getAddress(), user1.address))
        .to.equal(usdtAmount);
    });

    it("Should prevent trade replay", async function () {
      const { vault, flashETH, flashUSDT, faucet, user1, user2 } = await loadFixture(deployFixture);
      
      await faucet.connect(user1).claim();
      await faucet.connect(user2).claim();
      
      const ethAmount = hre.ethers.parseUnits("1", 18);
      const usdtAmount = hre.ethers.parseUnits("2500", 6);
      
      await flashETH.connect(user1).approve(await vault.getAddress(), ethAmount);
      await vault.connect(user1).deposit(await flashETH.getAddress(), ethAmount);
      await flashUSDT.connect(user2).approve(await vault.getAddress(), usdtAmount);
      await vault.connect(user2).deposit(await flashUSDT.getAddress(), usdtAmount);
      
      const tradeId = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("trade1"));
      await vault.settleSingleTrade(
        tradeId, user2.address, user1.address,
        await flashETH.getAddress(), await flashUSDT.getAddress(),
        ethAmount, usdtAmount, hre.ethers.parseUnits("2500", 6)
      );
      
      // Try to replay
      await expect(vault.settleSingleTrade(
        tradeId, user2.address, user1.address,
        await flashETH.getAddress(), await flashUSDT.getAddress(),
        ethAmount, usdtAmount, hre.ethers.parseUnits("2500", 6)
      )).to.be.revertedWithCustomError(vault, "TradeAlreadySettled");
    });
  });

  describe("OrderBookV2", function () {
    it("Should place and match orders", async function () {
      const { orderBook, user1, user2 } = await loadFixture(deployFixture);
      
      // User1 places buy order
      await orderBook.connect(user1).placeOrder(
        hre.ethers.parseUnits("2500", 6), // price
        hre.ethers.parseUnits("1", 18),   // amount
        true,  // isBuy
        0,     // limit order
        0,     // no stop price
        0      // no visible amount
      );
      
      // User2 places matching sell order
      await orderBook.connect(user2).placeOrder(
        hre.ethers.parseUnits("2500", 6),
        hre.ethers.parseUnits("1", 18),
        false, // isSell
        0, 0, 0
      );
      
      // Check trade was executed
      const stats = await orderBook.getStats();
      expect(stats._totalTrades).to.equal(1);
    });

    it("Should handle OCO orders", async function () {
      const { orderBook, user1 } = await loadFixture(deployFixture);
      
      const tx = await orderBook.connect(user1).placeOCO(
        hre.ethers.parseUnits("2600", 6), // limit price
        hre.ethers.parseUnits("2400", 6), // stop price
        hre.ethers.parseUnits("1", 18),   // amount
        true // isBuy
      );
      
      const receipt = await tx.wait();
      expect(receipt.logs.length).to.be.greaterThan(0);
    });

    it("Should cancel linked OCO order", async function () {
      const { orderBook, user1 } = await loadFixture(deployFixture);
      
      await orderBook.connect(user1).placeOCO(
        hre.ethers.parseUnits("2600", 6),
        hre.ethers.parseUnits("2400", 6),
        hre.ethers.parseUnits("1", 18),
        true
      );
      
      // Cancel first order (should cancel linked order too)
      await orderBook.connect(user1).cancelOrder(1);
      
      const order1 = await orderBook.orders(1);
      const order2 = await orderBook.orders(2);
      
      expect(order1.status).to.equal(3); // cancelled
      expect(order2.status).to.equal(3); // cancelled
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should batch place orders efficiently", async function () {
      const { orderBook, user1 } = await loadFixture(deployFixture);
      
      const prices = Array(10).fill(0).map((_, i) => 
        hre.ethers.parseUnits((2500 + i * 10).toString(), 6)
      );
      const amounts = Array(10).fill(hre.ethers.parseUnits("1", 18));
      const isBuys = Array(10).fill(true);
      
      const tx = await orderBook.connect(user1).batchPlaceOrders(prices, amounts, isBuys);
      const receipt = await tx.wait();
      
      console.log(`Batch 10 orders gas used: ${receipt.gasUsed}`);
      expect(receipt.gasUsed).to.be.lessThan(2000000n);
    });
  });
});
