const { expect } = require("chai");
import hre, { ethers, network } from "hardhat";
import { ERC721Mock, NomoPlayersDropMechanic, StrategyMock, ERC20Mock } from '../typechain';
import { BigNumber, Signer, ContractFactory, ContractReceipt, ContractTransaction } from 'ethers';
import { tokenPrice, collectibleItems, maxQuantity, testAddress, testAddress2, zeroAddress, ONE_MIN, ONE_HOUR, TWO_HOURS } from './helpers/constants';
import { getTokensFromEventArgs, getBlockTimestamp } from './helpers/helpers';

let deployer: Signer, deployerAddress: string;
let user: Signer, userAddress: string;
let daoWallet: Signer, daoWalletAddress: string;

async function setupSigners() {
  const accounts = await ethers.getSigners();
  deployer = accounts[0];
  deployerAddress = await accounts[0].getAddress();
  user = accounts[1];
  userAddress = await accounts[1].getAddress();
  daoWallet = accounts[2];
  daoWalletAddress = await accounts[2].getAddress();
}

describe("NomoPlayersDropMechanic tests", function () {
  let erc721Mock: ERC721Mock;
  let strategyMock: StrategyMock;
  let erc20Mock: ERC20Mock;
  let nomoPlayersDropMechanicContract: NomoPlayersDropMechanic;
  let nomoPlayersDropMechanicAddress: string;

  async function deployMockContracts(mintQty: number = 1000) {
    const ERC721Mock_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("ERC721Mock");
    const erc721MockTest = await ERC721Mock_Factory_Test.connect(deployer).deploy() as ERC721Mock;
    await erc721MockTest.deployed();
    const addressERC721MockTest: string = erc721MockTest.address;

    const Strategy_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("StrategyMock");
    const strategyMockTest = await Strategy_Factory_Test.connect(deployer).deploy() as StrategyMock;
    await strategyMockTest.deployed();
    const addressStrategyMockTest: string = strategyMockTest.address;

    const ERC20_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("ERC20Mock");
    const erc20MockTest = await ERC20_Factory_Test.connect(user).deploy(mintQty) as ERC20Mock;
    await erc20MockTest.deployed();
    const addressERC20MockTest: string = erc20MockTest.address;

    return { erc721MockTest, addressERC721MockTest, addressStrategyMockTest, erc20MockTest, addressERC20MockTest };
  }

  before(async function () {
    await setupSigners();
  });

  beforeEach(async function () {
    const ERC721Mock_Factory: ContractFactory = await hre.ethers.getContractFactory("ERC721Mock");
    erc721Mock = await ERC721Mock_Factory.connect(deployer).deploy() as ERC721Mock;
    await erc721Mock.deployed();
    const addressERC721Mock = erc721Mock.address;

    const Strategy_Factory: ContractFactory = await hre.ethers.getContractFactory("StrategyMock");
    strategyMock = await Strategy_Factory.connect(deployer).deploy() as StrategyMock;
    await strategyMock.deployed();
    const addressStrategyMock: string = strategyMock.address;

    const ERC20_Factory: ContractFactory = await hre.ethers.getContractFactory("ERC20Mock");
    const mintQty = 1000;
    erc20Mock = await ERC20_Factory.connect(user).deploy(mintQty) as ERC20Mock;
    await erc20Mock.deployed();
    const addressERC20Mock: string = erc20Mock.address;

    const mintCollectionTx = await erc721Mock.connect(deployer).mintCollection(collectibleItems);
    const txReceiptCollectible: ContractReceipt = await mintCollectionTx.wait();

    const mintedTokens: string[] = getTokensFromEventArgs(txReceiptCollectible, "LogCollectionMinted");

    expect(mintedTokens.length).not.to.equal(0);
    expect(addressERC721Mock).not.to.equal(zeroAddress);
    expect(addressStrategyMock).not.to.equal(zeroAddress);
    expect(addressERC20Mock).not.to.equal(zeroAddress);

    const NomoPlayersDropMechanic_Factory: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    nomoPlayersDropMechanicContract = await NomoPlayersDropMechanic_Factory.deploy(
      mintedTokens,
      addressERC721Mock,
      deployerAddress,
      tokenPrice,
      maxQuantity) as NomoPlayersDropMechanic;

    await nomoPlayersDropMechanicContract.connect(deployer).deployed();

    await nomoPlayersDropMechanicContract.setERC20Address(addressERC20Mock);
    await nomoPlayersDropMechanicContract.setDaoWalletAddress(daoWalletAddress);
    await nomoPlayersDropMechanicContract.setStrategyContractAddress(addressStrategyMock);
    await nomoPlayersDropMechanicContract.setWhitelisted([userAddress]);

    const timestamp = await getBlockTimestamp();
    const unixStartDate = timestamp + ONE_MIN;

    await nomoPlayersDropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate);
    await nomoPlayersDropMechanicContract.connect(deployer).setPresaleDuration(TWO_HOURS);

    const OVERTIME = TWO_HOURS + 61;
    await network.provider.send("evm_increaseTime", [OVERTIME]); // Simulate presale has finished

    nomoPlayersDropMechanicAddress = nomoPlayersDropMechanicContract.address;

    await erc721Mock.setApprovalForAll(nomoPlayersDropMechanicAddress, true, { from: deployerAddress });
  });

  it("should deploy NomoPlayersDropMechanic contract", async function () {
    expect(nomoPlayersDropMechanicContract.address).to.not.equal(zeroAddress);
  });

  context("for ERC20 address", () => {
    it("should emit LogERC20AddressSet event", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setERC20Address(testAddress)).to.emit(nomoPlayersDropMechanicContract, "LogERC20AddressSet");
    });

    it("should set ERC20 address", async function () {
      await nomoPlayersDropMechanicContract.connect(deployer).setERC20Address(testAddress);
      const erc20Address = await nomoPlayersDropMechanicContract.connect(deployer).erc20Address();
      expect(testAddress).to.equal(erc20Address)
    });

    it("must fail to set ERC20 address if msg.sender isn't owner", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(user).setERC20Address(testAddress))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set ERC20 address isn't valid", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setERC20Address(zeroAddress))
        .to.be.revertedWith("Not a valid address!");
    });
  });

  context("for Strategy contract address", () => {
    it("should emit LogStrategyContractAddressSet event", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setStrategyContractAddress(testAddress)).to.emit(nomoPlayersDropMechanicContract, "LogStrategyContractAddressSet");
    });

    it("should set Strategy contract address", async function () {
      await nomoPlayersDropMechanicContract.connect(deployer).setStrategyContractAddress(testAddress);
      const strategyContractAddress = await nomoPlayersDropMechanicContract.connect(deployer).strategyContractAddress();
      expect(testAddress).to.equal(strategyContractAddress)
    });

    it("must fail to set Strategy contract address if msg.sender isn't owner", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(user).setStrategyContractAddress(testAddress))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set Strategy contract address isn't valid", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setStrategyContractAddress(zeroAddress))
        .to.be.revertedWith("Not a valid address!");
    });
  });

  context("for Dao wallet address", () => {
    it("should emit LogDaoWalletAddressSet event", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setDaoWalletAddress(testAddress)).to.emit(nomoPlayersDropMechanicContract, "LogDaoWalletAddressSet");
    });

    it("should set Dao wallet address", async function () {
      await nomoPlayersDropMechanicContract.connect(deployer).setDaoWalletAddress(testAddress);
      const daoWalletAddress = await nomoPlayersDropMechanicContract.connect(deployer).daoWalletAddress();
      expect(testAddress).to.equal(daoWalletAddress)
    });

    it("must fail to set Dao wallet address if msg.sender isn't owner", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(user).setDaoWalletAddress(testAddress))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set Dao wallet address isn't valid", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setDaoWalletAddress(zeroAddress))
        .to.be.revertedWith("Not a valid address!");
    });
  });

  context("for presale start date", () => {
    it("should set presale start date", async function () {
      const timestamp = await getBlockTimestamp();
      const TWO_DAYS = ONE_HOUR * 24 * 2;
      const unixStartDate = timestamp + TWO_DAYS;

      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate);
      const presaleStartDate = await nomoPlayersDropMechanicContract.connect(deployer).presaleStartDate();
      expect(unixStartDate).to.equal(presaleStartDate)
    });

    it("should emit LogPresaleStartDateSet event", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setPresaleStartDate(testAddress)).to.emit(nomoPlayersDropMechanicContract, "LogPresaleStartDateSet");
    });

    it("must fail to set presale start date if msg.sender isn't owner", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(user).setPresaleStartDate(testAddress))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set presale start date if it's in the past", async function () {
      const timestamp = await getBlockTimestamp();
      const unixStartDate = timestamp - 1;
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate))
        .to.be.revertedWith("Presale start date can't be in the past");
    });
  });

  context("for presale duration", () => {
    it("should emit LogPresaleDurationSet event", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setPresaleDuration(testAddress)).to.emit(nomoPlayersDropMechanicContract, "LogPresaleDurationSet");
    });

    it("should set presale duration", async function () {
      // Set presale duration to two hours
      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleDuration(TWO_HOURS);
      const presaleDurationSet = await nomoPlayersDropMechanicContract.connect(deployer).presaleDuration();
      expect(TWO_HOURS).to.equal(presaleDurationSet)
    });

    it("must fail to set presale duration if msg.sender isn't owner", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(user).setPresaleDuration(testAddress))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set presale duration if presale duration is zero", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setPresaleDuration(0))
        .to.be.revertedWith("Presale: not a valid duration!");
    });
  });

  context("for whitelisted", () => {
    const whitelistedArrayAddresses: string[] = [testAddress, testAddress2, testAddress];

    it("should emit LogWhitelistedSet event", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setWhitelisted(whitelistedArrayAddresses)).to.emit(nomoPlayersDropMechanicContract, "LogWhitelistedSet");
    });

    it("should set whitelisted addresses", async function () {
      await nomoPlayersDropMechanicContract.connect(deployer).setWhitelisted(whitelistedArrayAddresses);

      let whitelistedAddresses = [];

      for (let i = 0; i < whitelistedArrayAddresses.length; i++) {
        const whitelistedAddress = await nomoPlayersDropMechanicContract.connect(deployer).whitelisted(whitelistedArrayAddresses[i]);
        whitelistedAddresses.push(whitelistedAddress);
      }

      expect(whitelistedAddresses.includes(false)).to.equal(false)
    });

    it("must fail to set whitelisted if msg.sender isn't owner", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(user).setWhitelisted(whitelistedArrayAddresses))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set whitelisted if whitelisted array does not have any addresses", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setWhitelisted([])).to.be.revertedWith("Beneficiaries array must include at least one address");
    });
  });

  context("for tokens purchasing on presale", () => {
    it("should buy tokens on presale from NomoPlayersDropMechanic contract", async function () {
      const timestamp = await getBlockTimestamp();
      const unixStartDate = timestamp + ONE_MIN;
      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate);

      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleDuration(TWO_HOURS);

      await network.provider.send("evm_increaseTime", [ONE_HOUR]);

      const isWhitelistedBefore =  await nomoPlayersDropMechanicContract.connect(deployer).whitelisted(userAddress);
      const userFundsBefore = await erc20Mock.balanceOf(userAddress);
      const daoWalletFundsBefore = await erc20Mock.balanceOf(daoWalletAddress);
      const strategyFundsBefore = await erc20Mock.balanceOf(strategyMock.address);
      const userTokensBefore = await erc721Mock.balanceOf(userAddress);
      const tokenVaultQtyBefore = await erc721Mock.balanceOf(deployerAddress);

      const tokensToBeBought = 1;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);

      await nomoPlayersDropMechanicContract.connect(user).buyTokensOnPresale();
     
      const isWhitelistedAfter =  await nomoPlayersDropMechanicContract.connect(deployer).whitelisted(userAddress);
      const userTokensAfter = await erc721Mock.balanceOf(userAddress);
      const tokenVaultQtyAfter = await erc721Mock.balanceOf(deployerAddress);
      const userFundsAfter = await erc20Mock.balanceOf(userAddress);
      const daoWalletFundsAfter = await erc20Mock.balanceOf(daoWalletAddress);
      const strategyFundsAfter = await erc20Mock.balanceOf(strategyMock.address);
      const nomoPlayersDropMechanicCollectibleLength = Number((await nomoPlayersDropMechanicContract.getTokensLeft()).toString());
      
      expect(isWhitelistedBefore).to.equal(true);
      expect(isWhitelistedAfter).to.equal(false);
      expect(nomoPlayersDropMechanicCollectibleLength).to.equal(collectibleItems - tokensToBeBought);
      expect(userFundsAfter).to.equal(userFundsBefore.sub(value));
      expect(strategyFundsBefore).to.equal(0);
      expect(daoWalletFundsAfter).to.equal(daoWalletFundsBefore.add(value.div(5)));
      expect(strategyFundsAfter).to.equal(value.div(5).mul(4));
      expect(tokenVaultQtyBefore).to.equal(collectibleItems);
      expect(tokenVaultQtyAfter).to.equal(collectibleItems - tokensToBeBought);
      expect(userTokensBefore).to.equal(0);
      expect(userTokensAfter).to.equal(tokensToBeBought);
    });

    it("must fail if presale hasn't started", async function () {
      const timestamp = await getBlockTimestamp();
      const unixStartDate = timestamp + ONE_MIN;
      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate);

      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleDuration(TWO_HOURS);

      const tokensToBeApproved = 1;
      const value = BigNumber.from(tokensToBeApproved).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);

      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnPresale()).to.be.revertedWith("Current timestamp is not in the bounds of the presale period");
    });

    it("must fail if presale has ended", async function () {
      const timestamp = await getBlockTimestamp();
      const unixStartDate = timestamp + ONE_MIN;
      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate);

      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleDuration(TWO_HOURS);

      const OVERTIME = TWO_HOURS + ONE_MIN + 1;
      await network.provider.send("evm_increaseTime", [OVERTIME]);

      const tokensToBeApproved = 1;
      const value = BigNumber.from(tokensToBeApproved).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);

      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnPresale()).to.be.revertedWith("Current timestamp is not in the bounds of the presale period");
    });

    it("must fail if user is not whitelisted", async function () {
      const timestamp = await getBlockTimestamp();
      const unixStartDate = timestamp + ONE_MIN;
      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate);

      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleDuration(TWO_HOURS);

      await network.provider.send("evm_increaseTime", [ONE_HOUR]);

      const tokensToBeApproved = 1;
      const value = BigNumber.from(tokensToBeApproved).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);

      // Here we use `deployer` as a signer, who is not whitelisted in the presale
      await expect(nomoPlayersDropMechanicContract.connect(deployer).buyTokensOnPresale()).to.be.revertedWith("Claiming is forbidden");
    });

    it("must fail if user has already claimed", async function () {
      const timestamp = await getBlockTimestamp();
      const unixStartDate = timestamp + ONE_MIN;
      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate);

      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleDuration(TWO_HOURS);

      await network.provider.send("evm_increaseTime", [ONE_HOUR]);
      // Approve 2 tokens 
      const tokensToBeApproved = 2;
      const value = BigNumber.from(tokensToBeApproved).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);

      await nomoPlayersDropMechanicContract.connect(user).buyTokensOnPresale();

      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnPresale()).to.be.revertedWith("Claiming is forbidden");
    });
  });

  context("for tokens purchasing on sale", () => {
    it("should emit LogTokensBought event", async function () {
      const tokensToBeBought = 1;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);
      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought)).to.emit(nomoPlayersDropMechanicContract, "LogTokensBought");
    });

    it("should buy tokens from NomoPlayersDropMechanic contract", async function () {
      const userFundsBefore = await erc20Mock.balanceOf(userAddress);
      const daoWalletFundsBefore = await erc20Mock.balanceOf(daoWalletAddress);
      const strategyFundsBefore = await erc20Mock.balanceOf(strategyMock.address);
      const userTokensBefore = await erc721Mock.balanceOf(userAddress);
      const tokenVaultQtyBefore = await erc721Mock.balanceOf(deployerAddress);

      const tokensToBeBought = 7;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);
      await nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought);

      const userTokensAfter = await erc721Mock.balanceOf(userAddress);
      const tokenVaultQtyAfter = await erc721Mock.balanceOf(deployerAddress);
      const userFundsAfter = await erc20Mock.balanceOf(userAddress);
      const daoWalletFundsAfter = await erc20Mock.balanceOf(daoWalletAddress);
      const strategyFundsAfter = await erc20Mock.balanceOf(strategyMock.address);
      const nomoPlayersDropMechanicCollectibleLength = Number((await nomoPlayersDropMechanicContract.getTokensLeft()).toString());

      expect(nomoPlayersDropMechanicCollectibleLength).to.equal(collectibleItems - tokensToBeBought);
      expect(userFundsAfter).to.equal(userFundsBefore.sub(value));
      expect(strategyFundsBefore).to.equal(0);
      expect(daoWalletFundsAfter).to.equal(daoWalletFundsBefore.add(value.div(5)));
      expect(strategyFundsAfter).to.equal(value.div(5).mul(4));
      expect(tokenVaultQtyBefore).to.equal(collectibleItems);
      expect(tokenVaultQtyAfter).to.equal(collectibleItems - tokensToBeBought);
      expect(userTokensBefore).to.equal(0);
      expect(userTokensAfter).to.equal(tokensToBeBought);
    });

    it("must fail to buy tokens on sale before the actual sale has started", async function () {
      const timestamp = await getBlockTimestamp();
      const unixStartDate = timestamp + ONE_MIN;
      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate);

      await nomoPlayersDropMechanicContract.connect(deployer).setPresaleDuration(TWO_HOURS);

      await network.provider.send("evm_increaseTime", [ONE_HOUR]); // Simulate presale hasn't finished

      const tokensToBeBought = 7;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);
      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(7)).to.be.revertedWith("Sale period not started!");
    });

    it("must fail to deploy NomoPlayersDropMechanic contract if tokens array is empty", async () => {
      const { addressERC721MockTest } = await deployMockContracts();

      const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");

      await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
        [],
        addressERC721MockTest,
        deployerAddress,
        tokenPrice,
        maxQuantity
      ) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith("Tokens array must include at least one item");
    });

    it("must fail to deploy NomoPlayersDropMechanic contract if token price is zero", async () => {
      const { addressERC721MockTest } = await deployMockContracts();

      const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
      const mintedTokensDummy: number[] = Array.from({ length: 100 }, (_, i) => i + 1);
      const fakeTokenPrice = 0;

      await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
        mintedTokensDummy,
        addressERC721MockTest,
        deployerAddress,
        fakeTokenPrice,
        maxQuantity) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Token price must be higher than zero');
    });

    it("must fail to deploy NomoPlayersDropMechanic contract if maximum quantity is zero", async () => {
      const { addressERC721MockTest } = await deployMockContracts();

      const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
      const mintedTokensDummy: number[] = Array.from({ length: 100 }, (_, i) => i + 1);
      const fakeMaxQuantity = 0;

      await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
        mintedTokensDummy,
        addressERC721MockTest,
        deployerAddress,
        tokenPrice,
        fakeMaxQuantity) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Maximum quantity must be higher than zero');
    });

    it("must fail to deploy NomoPlayersDropMechanic contract if ERC721 address is not valid", async () => {
      const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
      const mintedTokensDummy: number[] = Array.from({ length: 100 }, (_, i) => i + 1);

      await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
        mintedTokensDummy,
        zeroAddress,
        deployerAddress,
        tokenPrice,
        maxQuantity) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Not a valid address!');
    });

    it("must fail if requested quantity is lower or equal to zero", async function () {
      const tokensToBeBought = 0;
      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought))
        .to.be.revertedWith("Invalid quantity");
    });

    it("must fail if quantity is higher than the items in the collection", async function () {
      const tokensToBeBought1 = 20;
      const value1 = BigNumber.from(tokensToBeBought1).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value1);
      await nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought1);

      const tokensToBeBought2 = 6;
      const value2 = BigNumber.from(tokensToBeBought1).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value2);
      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought2))
        .to.be.revertedWith("Insufficient available quantity");
    });

    it("must fail if requested quantity exceeds the limit", async function () {
      const tokensToBeBought = 21;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);
      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought))
        .to.be.revertedWith("Invalid quantity");
    });

    it("must fail if NomoPlayersDropMechanic contract is not approved", async function () {
      await erc721Mock.setApprovalForAll(nomoPlayersDropMechanicAddress, false, { from: deployerAddress });
      const tokensToBeBought = 10;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);
      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought))
        .to.be.revertedWith('ERC721: transfer caller is not owner nor approved');
    });

    it("must fail if user doesn't have enough ERC20 tokens", async function () {
      // Deploy ERC721Mock, StrategyMock and ERC20Mock, and mint `n` tokens on `user` address who is also deployer of the ERC20Mock contract
      const { erc721MockTest, addressERC721MockTest, addressStrategyMockTest, erc20MockTest, addressERC20MockTest } = await deployMockContracts(9);

      const userFundsBefore = await erc20MockTest.balanceOf(userAddress);
      const tokenVaultQtyBefore = await erc721Mock.balanceOf(deployerAddress);
      const daoWalletFundsBefore = await erc20MockTest.balanceOf(daoWalletAddress);
      const strategyFundsBefore = await erc20MockTest.balanceOf(strategyMock.address);
      const userTokensBefore = await erc721MockTest.balanceOf(userAddress);

      const tokensToBeBought = 10;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);

      const mintCollectionTx = await erc721MockTest.connect(deployer).mintCollection(collectibleItems);
      const txReceiptCollectible: ContractReceipt = await mintCollectionTx.wait();
      const mintedTokens: string[] = getTokensFromEventArgs(txReceiptCollectible, "LogCollectionMinted");

      const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
      const nomoPlayersDropMechanicTestContract = await NomoPlayersDropMechanic_Factory_Test.deploy(
        mintedTokens,
        addressERC721MockTest,
        deployerAddress,
        tokenPrice,
        maxQuantity) as NomoPlayersDropMechanic;
      await nomoPlayersDropMechanicTestContract.connect(deployer).deployed();
      await nomoPlayersDropMechanicTestContract.setERC20Address(addressERC20MockTest);
      await nomoPlayersDropMechanicTestContract.setDaoWalletAddress(daoWalletAddress);
      await nomoPlayersDropMechanicTestContract.setStrategyContractAddress(addressStrategyMockTest);

      const nomoPlayersDropMechanicTestAddress: string = nomoPlayersDropMechanicTestContract.address;

      // Set approval for all tokens nomoPlayersDropMechanicTestContract to distribute the items owned by ERC721Mock deployer
      await erc721MockTest.setApprovalForAll(nomoPlayersDropMechanicTestAddress, true, { from: deployerAddress });

      // Approve nomoPlayersDropMechanicTestContract to spend user's tokens
      await erc20MockTest.connect(user).approve(nomoPlayersDropMechanicTestAddress, value);

      await expect(nomoPlayersDropMechanicTestContract.connect(user).buyTokensOnSale(tokensToBeBought))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");

      const userTokensAfter = await erc721MockTest.balanceOf(userAddress);
      const tokenVaultQtyAfter = await erc721Mock.balanceOf(deployerAddress);
      const userFundsAfter = await erc20MockTest.balanceOf(userAddress);
      const daoWalletFundsAfter = await erc20MockTest.balanceOf(daoWalletAddress);
      const strategyFundsAfter = await erc20MockTest.balanceOf(strategyMock.address);
      const nomoPlayersDropMechanicCollectibleLength = Number((await nomoPlayersDropMechanicContract.getTokensLeft()).toString());

      // The state of the balances must not have changed after, because of the reverted transacted
      expect(tokenVaultQtyBefore).to.equal(collectibleItems);
      expect(tokenVaultQtyAfter).to.equal(tokenVaultQtyBefore);
      expect(nomoPlayersDropMechanicCollectibleLength).to.equal(collectibleItems);
      expect(userFundsAfter).to.equal(userFundsBefore);
      expect(strategyFundsBefore).to.equal(0);
      expect(strategyFundsAfter).to.equal(strategyFundsBefore);
      expect(daoWalletFundsAfter).to.equal(daoWalletFundsBefore);
      expect(userTokensBefore).to.equal(0);
      expect(userTokensAfter).to.equal(userTokensBefore);
    });
  });
});
