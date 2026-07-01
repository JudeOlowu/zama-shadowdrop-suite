import { expect } from "chai";
import { ethers } from "hardhat";
import { ConfidentialWrapperFactory, MockERC20 } from "../typechain-types";

/**
 * ConfidentialWrapper Tests
 * NOTE: Full FHE operation tests require the Zama Hardhat plugin connected
 *       to a FHEVM node. These tests validate the contract logic and interfaces.
 *       On a local Hardhat node, FHE calls are mocked/stubbed.
 */
describe("ConfidentialWrapperFactory", function () {
  let factory: ConfidentialWrapperFactory;
  let mockToken: MockERC20;
  let owner: any, user1: any, user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC-20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = (await MockERC20.deploy("Test Token", "TT", 18)) as MockERC20;
    await mockToken.waitForDeployment();

    // Deploy factory
    const Factory = await ethers.getContractFactory("ConfidentialWrapperFactory");
    factory = (await Factory.deploy()) as ConfidentialWrapperFactory;
    await factory.waitForDeployment();
  });

  describe("deployWrapper", function () {
    it("should deploy a wrapper for an ERC-20 token", async function () {
      const tx = await factory.deployWrapper(
        await mockToken.getAddress(),
        "Confidential Test Token",
        "cTT",
        18
      );
      await tx.wait();

      const wrapperAddr = await factory.wrapperOf(await mockToken.getAddress());
      expect(wrapperAddr).to.not.equal(ethers.ZeroAddress);
      expect(await factory.totalWrappers()).to.equal(1n);
    });

    it("should not allow duplicate wrappers for the same ERC-20", async function () {
      await factory.deployWrapper(await mockToken.getAddress(), "cTT", "cTT", 18);
      await expect(
        factory.deployWrapper(await mockToken.getAddress(), "cTT2", "cTT2", 18)
      ).to.be.revertedWith("Wrapper already exists");
    });

    it("should reject zero address token", async function () {
      await expect(
        factory.deployWrapper(ethers.ZeroAddress, "cTT", "cTT", 18)
      ).to.be.revertedWith("Invalid token address");
    });

    it("should reject empty name or symbol", async function () {
      await expect(
        factory.deployWrapper(await mockToken.getAddress(), "", "cTT", 18)
      ).to.be.revertedWith("Name required");

      const MockERC20_2 = await ethers.getContractFactory("MockERC20");
      const token2 = await MockERC20_2.deploy("Token2", "TK2", 18);
      await expect(
        factory.deployWrapper(await token2.getAddress(), "cTK2", "", 18)
      ).to.be.revertedWith("Symbol required");
    });

    it("should emit WrapperDeployed event", async function () {
      const tokenAddr = await mockToken.getAddress();
      await expect(factory.deployWrapper(tokenAddr, "cTT", "cTT", 18))
        .to.emit(factory, "WrapperDeployed")
        .withArgs(tokenAddr, expect.anything, "cTT", "cTT", owner.address);
    });

    it("should return correct wrapper info", async function () {
      await factory.deployWrapper(await mockToken.getAddress(), "Confidential TT", "cTT", 18);
      const info = await factory.getAllWrapperInfo();

      expect(info.length).to.equal(1);
      expect(info[0].name).to.equal("Confidential TT");
      expect(info[0].symbol).to.equal("cTT");
      expect(info[0].decimals).to.equal(18n);
      expect(info[0].deployer).to.equal(owner.address);
    });

    it("should allow multiple different wrappers", async function () {
      const MockERC20_2 = await ethers.getContractFactory("MockERC20");
      const token2 = await MockERC20_2.deploy("Token2", "TK2", 6);
      await token2.waitForDeployment();

      await factory.deployWrapper(await mockToken.getAddress(), "cTT", "cTT", 18);
      await factory.deployWrapper(await token2.getAddress(), "cTK2", "cTK2", 6);

      expect(await factory.totalWrappers()).to.equal(2n);
      expect(await factory.hasWrapper(await mockToken.getAddress())).to.be.true;
      expect(await factory.hasWrapper(await token2.getAddress())).to.be.true;
    });
  });

  describe("MockERC20 Faucet", function () {
    it("should mint 10,000 tokens to caller", async function () {
      await mockToken.connect(user1).faucet();
      const balance = await mockToken.balanceOf(user1.address);
      expect(balance).to.equal(ethers.parseEther("10000"));
    });
  });
});
