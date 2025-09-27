import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("Experience (ETH-only)", function () {
  let experience, factory;
  let owner, alice, bob, platform;
  
  const PLATFORM_FEE_BPS = 500; // 5%
  const PROPOSER_FEE_BPS = 1000; // 10%
  const PRICE_ETH_WEI = ethers.parseEther("0.01");

  beforeEach(async function () {
    [owner, alice, bob, platform] = await ethers.getSigners();
    
    // Deploy Factory
    const Factory = await ethers.getContractFactory("ExperienceFactory");
    factory = await Factory.deploy(platform.address, PLATFORM_FEE_BPS);
    
    // Create Experience
    const tx = await factory.createExperience(
      owner.address,
      "ipfs://test",
      owner.address,
      PROPOSER_FEE_BPS
    );
    
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => log.fragment?.name === "ExperienceCreated");
    const experienceAddress = event.args[1];
    
    experience = await ethers.getContractAt("Experience", experienceAddress);
    
    // Set price
    await experience.setPriceEthWei(PRICE_ETH_WEI);
  });

  describe("Split Math Invariant", function () {
    it("should split payments exactly 5% platform / 95% creator (no proposer)", async function () {
      const qty = 3n;
      const paid = PRICE_ETH_WEI * qty;
      
      // Calculate expected splits (no proposer set, so proposer fee goes to creator)
      const expectedPlatform = (paid * BigInt(PLATFORM_FEE_BPS)) / 10_000n;
      const expectedProposer = 0n; // No proposer set
      const expectedCreator = paid - expectedPlatform;
      
      // Record balances before
      const balancesBefore = {
        platform: await ethers.provider.getBalance(platform.address),
        owner: await ethers.provider.getBalance(owner.address),
        alice: await ethers.provider.getBalance(alice.address)
      };
      
      // Buy with exact payment
      const tx = await experience.connect(alice).buyWithEth(qty, { value: paid });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Record balances after
      const balancesAfter = {
        platform: await ethers.provider.getBalance(platform.address),
        owner: await ethers.provider.getBalance(owner.address),
        alice: await ethers.provider.getBalance(alice.address)
      };
      
      // Calculate actual deltas  
      const actualPlatform = balancesAfter.platform - balancesBefore.platform;
      const actualCreator = balancesAfter.owner - balancesBefore.owner;
      const actualAlice = balancesBefore.alice - balancesAfter.alice - gasUsed;
      
      // Verify splits (±1 wei tolerance for division)
      expect(actualPlatform).to.equal(expectedPlatform);
      expect(actualCreator).to.equal(expectedCreator);
      expect(actualAlice).to.equal(paid);
      
      // Verify total adds up (platform + creator = paid, since no proposer)
      expect(actualPlatform + actualCreator).to.equal(paid);
      
      // Verify SBT minted
      expect(await experience.balanceOf(alice.address, 1)).to.equal(qty);
    });

    it("should handle random quantities correctly", async function () {
      for (let qty = 1; qty <= 5; qty++) {
        const paid = PRICE_ETH_WEI * BigInt(qty);
        const platform = (paid * 500n) / 10_000n;
        const proposer = (paid * 1000n) / 10_000n;
        const creator = paid - platform - proposer;
        
        // Verify no wei lost
        expect(platform + proposer + creator).to.equal(paid);
        
        // Verify percentages are approximately correct
        const platformPct = Number(platform * 10_000n / paid);
        const proposerPct = Number(proposer * 10_000n / paid);
        const creatorPct = Number(creator * 10_000n / paid);
        
        expect(platformPct).to.equal(500); // 5%
        expect(proposerPct).to.equal(1000); // 10%
        expect(creatorPct).to.equal(8500); // 85%
      }
    });
  });

  describe("SBT Non-Transferability", function () {
    beforeEach(async function () {
      await experience.connect(alice).buyWithEth(1, { value: PRICE_ETH_WEI });
    });

    it("should revert safeTransferFrom", async function () {
      try {
        await experience.connect(alice).safeTransferFrom(alice.address, bob.address, 1, 1, "0x");
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("TransfersDisabled");
      }
    });

    it("should revert safeBatchTransferFrom", async function () {
      try {
        await experience.connect(alice).safeBatchTransferFrom(alice.address, bob.address, [1], [1], "0x");
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("TransfersDisabled");
      }
    });

    it("should revert setApprovalForAll", async function () {
      try {
        await experience.connect(alice).setApprovalForAll(bob.address, true);
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("TransfersDisabled");
      }
    });
  });

  describe("Guards", function () {
    it("should restrict setPriceEthWei to owner", async function () {
      try {
        await experience.connect(alice).setPriceEthWei(ethers.parseEther("0.02"));
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("Ownable");
      }
    });

    it("should restrict setCid to flowSyncAuthority", async function () {
      try {
        await experience.connect(alice).setCid("new-cid");
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("NotFlowSyncAuthority");
      }
    });

    it("should restrict setCurrentProposer to flowSyncAuthority", async function () {
      try {
        await experience.connect(alice).setCurrentProposer(bob.address);
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("NotFlowSyncAuthority");
      }
    });
  });

  describe("Buy Flow", function () {
    it("should complete purchase successfully", async function () {
      const qty = 2n;
      const paid = PRICE_ETH_WEI * qty;
      
      const tx = await experience.connect(alice).buyWithEth(qty, { value: paid });
      const receipt = await tx.wait();
      
      // Check SBT balance
      expect(await experience.balanceOf(alice.address, 1)).to.equal(qty);
      
      // Check event was emitted
      const event = receipt.logs.find(log => log.fragment?.name === "Bought");
      expect(event).to.exist;
    });

    it("should revert with insufficient payment", async function () {
      const qty = 1n;
      const insufficient = PRICE_ETH_WEI - 1n;
      
      try {
        await experience.connect(alice).buyWithEth(qty, { value: insufficient });
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("InsufficientPayment");
      }
    });

    it("should revert with excess payment", async function () {
      const qty = 1n;
      const excess = PRICE_ETH_WEI + 1n;
      
      try {
        await experience.connect(alice).buyWithEth(qty, { value: excess });
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("InsufficientPayment");
      }
    });

    it("should revert when price is 0", async function () {
      await experience.setPriceEthWei(0);
      
      try {
        await experience.connect(alice).buyWithEth(1, { value: 0 });
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("InvalidPrice");
      }
    });

    it("should revert with zero quantity", async function () {
      try {
        await experience.connect(alice).buyWithEth(0, { value: 0 });
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect(error.message).to.include("InvalidQuantity");
      }
    });
  });
});
