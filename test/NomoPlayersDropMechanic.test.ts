const { expect } = require("chai");
import hre, { ethers } from "hardhat";
import { ERC721Mock, NomoPlayersDropMechanic, StrategyMock, DAIMock } from '../typechain';
import { BigNumber, Signer, ContractFactory, ContractReceipt, ContractTransaction } from 'ethers';
import { tokenPrice, collectibleItems, maxQuantity, zeroAddress } from './helpers/constants';
import { getTokensFromEventArgs } from './helpers/helpers';

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
  let daiMock: DAIMock;
  let nomoPlayersDropMechanicContract: NomoPlayersDropMechanic;
  let nomoPlayersDropMechanicAddress: string;

  async function deployMockContracts(mintQty: number = 1000) {
    const ERC721Mock_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("ERC721Mock");
    const erc721MockTest = await ERC721Mock_Factory_Test.connect(deployer).deploy() as ERC721Mock;
    await erc721MockTest.deployed();
    const addressERC721MockTest = erc721MockTest.address;

    const Strategy_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("StrategyMock");
    const strategyMockTest = await Strategy_Factory_Test.connect(deployer).deploy() as StrategyMock;
    await strategyMockTest.deployed();
    const addressStrategyMockTest = strategyMockTest.address;

    const DAI_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("DAIMock");
    const daiMockTest = await DAI_Factory_Test.connect(user).deploy(mintQty) as DAIMock;
    await daiMockTest.deployed();
    const addressDAIMockTest = daiMockTest.address;

    return { erc721MockTest, addressERC721MockTest, addressStrategyMockTest, daiMockTest, addressDAIMockTest };
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
    const addressStrategyMock = strategyMock.address;

    const DAI_Factory: ContractFactory = await hre.ethers.getContractFactory("DAIMock");
    const mintQty = 1000;
    daiMock = await DAI_Factory.connect(user).deploy(mintQty) as DAIMock;
    await daiMock.deployed();
    const addressDAIMock = daiMock.address;

    const mintCollectionTx = await erc721Mock.connect(deployer).mintCollection(collectibleItems);
    const txReceiptCollectible: ContractReceipt = await mintCollectionTx.wait();

    const mintedTokens: string[] = getTokensFromEventArgs(txReceiptCollectible, "LogCollectionMinted");

    expect(mintedTokens.length).not.to.equal(0);
    expect(addressERC721Mock).not.to.equal(zeroAddress);
    expect(addressStrategyMock).not.to.equal(zeroAddress);
    expect(addressDAIMock).not.to.equal(zeroAddress);

    const NomoPlayersDropMechanic_Factory: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    nomoPlayersDropMechanicContract = await NomoPlayersDropMechanic_Factory.deploy(
      mintedTokens,
      tokenPrice,
      maxQuantity,
      addressDAIMock,
      addressERC721Mock,
      daoWalletAddress,
      addressStrategyMock,
      deployerAddress) as NomoPlayersDropMechanic;
    await nomoPlayersDropMechanicContract.connect(deployer).deployed();

    nomoPlayersDropMechanicAddress = nomoPlayersDropMechanicContract.address;

    await erc721Mock.setApprovalForAll(nomoPlayersDropMechanicAddress, true, { from: deployerAddress });
  });

  it("should deploy NomoPlayersDropMechanic contract", async function () {
    expect(nomoPlayersDropMechanicContract.address).to.not.equal(zeroAddress);
  });

  it("should buy tokens from NomoPlayersDropMechanic contract", async function () {
    const userFundsBefore = await daiMock.balanceOf(userAddress);
    const daoWalletFundsBefore = await daiMock.balanceOf(daoWalletAddress);
    const strategyFundsBefore = await daiMock.balanceOf(strategyMock.address);
    const userTokensBefore = await erc721Mock.balanceOf(userAddress);
    const deployerFundsBefore = await erc721Mock.balanceOf(deployerAddress);

    const tokensToBeBought = 10;
    const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
    await daiMock.connect(user).approve(nomoPlayersDropMechanicAddress, value);
    const buyTokensTx: ContractTransaction = await nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought);
    await buyTokensTx.wait();

    const userTokensAfter = await erc721Mock.balanceOf(userAddress);
    const deployerFundsAfter = await erc721Mock.balanceOf(deployerAddress);
    const userFundsAfter = await daiMock.balanceOf(userAddress);
    const daoWalletFundsAfter = await daiMock.balanceOf(daoWalletAddress);
    const strategyFundsAfter = await daiMock.balanceOf(strategyMock.address);
    const nomoPlayersDropMechanicCollectibleLength = Number((await nomoPlayersDropMechanicContract.getTokensLeft()).toString());

    expect(nomoPlayersDropMechanicCollectibleLength).to.equal(collectibleItems - tokensToBeBought);
    expect(userFundsAfter).to.equal(userFundsBefore.sub(value));
    expect(strategyFundsBefore).to.equal(0);
    expect(daoWalletFundsAfter).to.equal(daoWalletFundsBefore.add(value.div(5).mul(1)));
    expect(strategyFundsAfter).to.equal(value.div(5).mul(4));
    expect(deployerFundsBefore).to.equal(collectibleItems);
    expect(deployerFundsAfter).to.equal(collectibleItems - tokensToBeBought);
    expect(userTokensBefore).to.equal(0);
    expect(userTokensAfter).to.equal(tokensToBeBought);
  });

  it("should emit LogTokensBought event", async function () {
    const tokensToBeBought = 1;
    const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
    await daiMock.connect(user).approve(nomoPlayersDropMechanicAddress, value);
    await expect(nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought)).to.emit(nomoPlayersDropMechanicContract, "LogTokensBought");
  });

  it("must fail to deploy NomoPlayersDropMechanic contract if tokens array is empty", async () => {
    const { addressERC721MockTest, addressStrategyMockTest, addressDAIMockTest } = await deployMockContracts();

    const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");

    await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
      [],
      tokenPrice,
      maxQuantity,
      addressDAIMockTest,
      addressERC721MockTest,
      daoWalletAddress,
      addressStrategyMockTest,
      deployerAddress) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith("Tokens array must include at least one item");
  });

  it("must fail to deploy NomoPlayersDropMechanic contract if token price is zero", async () => {
    const { addressERC721MockTest, addressStrategyMockTest, addressDAIMockTest } = await deployMockContracts();

    const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    const mintedTokensTest: number[] = Array.from({ length: 100 }, (_, i) => i + 1);
    const fakeTokenPrice = 0;

    await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
      mintedTokensTest,
      fakeTokenPrice,
      maxQuantity,
      addressDAIMockTest,
      addressERC721MockTest,
      daoWalletAddress,
      addressStrategyMockTest,
      deployerAddress) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Token price must be higher than zero');
  });

  it("must fail to deploy NomoPlayersDropMechanic contract if maximum quantity is zero", async () => {
    const { addressERC721MockTest, addressStrategyMockTest, addressDAIMockTest } = await deployMockContracts();

    const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    const mintedTokensTest: number[] = Array.from({ length: 100 }, (_, i) => i + 1);
    const fakeMaxQuantity = 0;

    await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
      mintedTokensTest,
      tokenPrice,
      fakeMaxQuantity,
      addressDAIMockTest,
      addressERC721MockTest,
      daoWalletAddress,
      addressStrategyMockTest,
      deployerAddress) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Maximum quantity must be higher than zero');
  });

  it("must fail to deploy NomoPlayersDropMechanic contract if ERC721 address is not valid", async () => {
    const { addressStrategyMockTest, addressDAIMockTest } = await deployMockContracts();

    const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    const mintedTokensTest: number[] = Array.from({ length: 100 }, (_, i) => i + 1);

    await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
      mintedTokensTest,
      tokenPrice,
      maxQuantity,
      addressDAIMockTest,
      zeroAddress,
      daoWalletAddress,
      addressStrategyMockTest,
      deployerAddress) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Not valid address');
  });

  it("must fail to deploy NomoPlayersDropMechanic contract if Dao address is not valid", async () => {
    const { addressERC721MockTest, addressDAIMockTest } = await deployMockContracts();

    const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    const mintedTokensTest: number[] = Array.from({ length: 100 }, (_, i) => i + 1);

    await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
      mintedTokensTest,
      tokenPrice,
      maxQuantity,
      addressDAIMockTest,
      addressERC721MockTest,
      daoWalletAddress,
      zeroAddress,
      deployerAddress) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Not valid address');
  });

  it("must fail to deploy NomoPlayersDropMechanic contract if Strategy contract address is not valid", async () => {
    const { addressERC721MockTest, addressStrategyMockTest, addressDAIMockTest } = await deployMockContracts();

    const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    const mintedTokensTest: number[] = Array.from({ length: 100 }, (_, i) => i + 1);

    await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
      mintedTokensTest,
      tokenPrice,
      maxQuantity,
      addressDAIMockTest,
      addressERC721MockTest,
      zeroAddress,
      addressStrategyMockTest,
      deployerAddress) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Not valid address');
  });

  it("must fail if requested quantity is lower or equal to zero", async function () {
    const tokensToBeBought = 0;
    await expect(nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought))
      .to.be.revertedWith("Invalid quantity");
  });

  it("must fail if quantity is higher than the items in the collection", async function () {
    const tokensToBeBought1 = 20;
    const value1 = BigNumber.from(tokensToBeBought1).mul(tokenPrice);
    await daiMock.connect(user).approve(nomoPlayersDropMechanicAddress, value1);
    await nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought1);

    const tokensToBeBought2 = 6;
    const value2 = BigNumber.from(tokensToBeBought1).mul(tokenPrice);
    await daiMock.connect(user).approve(nomoPlayersDropMechanicAddress, value2);
    await expect(nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought2))
      .to.be.revertedWith("Insufficient available quantity");
  });

  it("must fail if requested quantity exceeds the limit", async function () {
    const tokensToBeBought = 21;
    const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
    await daiMock.connect(user).approve(nomoPlayersDropMechanicAddress, value);
    await expect(nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought))
      .to.be.revertedWith("Invalid quantity");
  });

  it("must fail if NomoPlayersDropMechanic contract is not approved", async function () {
    await erc721Mock.setApprovalForAll(nomoPlayersDropMechanicAddress, false, { from: deployerAddress });
    const tokensToBeBought = 10;
    const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
    await daiMock.connect(user).approve(nomoPlayersDropMechanicAddress, value);
    await expect(nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought))
      .to.be.revertedWith('ERC721: transfer caller is not owner nor approved');
  });

  it("must fail if user doesn't have enough DAI", async function () {
    // Deploy ERC721Mock, StrategyMock and DAIMock, and mint `n` tokens on `user` address  who is also deployer of the DAIMock contract
    const { erc721MockTest, addressERC721MockTest, addressStrategyMockTest, daiMockTest, addressDAIMockTest } = await deployMockContracts(9);

    const userFundsBefore = await daiMockTest.balanceOf(userAddress);
    const daoWalletFundsBefore = await daiMockTest.balanceOf(daoWalletAddress);
    const strategyFundsBefore = await daiMockTest.balanceOf(strategyMock.address);
    const userTokensBefore = await erc721MockTest.balanceOf(userAddress);

    const tokensToBeBought = 10;
    const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);

    const mintCollectionTx = await erc721MockTest.connect(deployer).mintCollection(collectibleItems);
    const txReceiptCollectible: ContractReceipt = await mintCollectionTx.wait();
    const mintedTokens: string[] = getTokensFromEventArgs(txReceiptCollectible, "LogCollectionMinted");

    const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    const nomoPlayersDropMechanicTestContract = await NomoPlayersDropMechanic_Factory_Test.deploy(
      mintedTokens,
      tokenPrice,
      maxQuantity,
      addressDAIMockTest,
      addressERC721MockTest,
      daoWalletAddress,
      addressStrategyMockTest,
      deployerAddress) as NomoPlayersDropMechanic;
    await nomoPlayersDropMechanicTestContract.connect(deployer).deployed();
    const nomoPlayersDropMechanicTestAddress: string = nomoPlayersDropMechanicTestContract.address;

    // Set approval for all tokens nomoPlayersDropMechanicTestContract to distribute the items owned by ERC721Mock deployer
    await erc721MockTest.setApprovalForAll(nomoPlayersDropMechanicTestAddress, true, { from: deployerAddress });

    // Approve nomoPlayersDropMechanicTestContract to spend user's tokens
    await daiMockTest.connect(user).approve(nomoPlayersDropMechanicTestAddress, value);
    
    await expect(nomoPlayersDropMechanicTestContract.connect(user).buyTokens(tokensToBeBought))
      .to.be.revertedWith("ERC20: transfer amount exceeds balance");

    const userTokensAfter = await erc721MockTest.balanceOf(userAddress);
    const userFundsAfter = await daiMockTest.balanceOf(userAddress);
    const daoWalletFundsAfter = await daiMockTest.balanceOf(daoWalletAddress);
    const strategyFundsAfter = await daiMockTest.balanceOf(strategyMock.address);
    const nomoPlayersDropMechanicCollectibleLength = Number((await nomoPlayersDropMechanicContract.getTokensLeft()).toString());

    // The state of the balances must not have changed after, because of the reverted transacted
    expect(nomoPlayersDropMechanicCollectibleLength).to.equal(collectibleItems);
    expect(userFundsAfter).to.equal(userFundsBefore);
    expect(strategyFundsBefore).to.equal(0);
    expect(strategyFundsAfter).to.equal(strategyFundsBefore);
    expect(daoWalletFundsAfter).to.equal(daoWalletFundsBefore);
    expect(userTokensBefore).to.equal(0);
    expect(userTokensAfter).to.equal(userTokensBefore);
  });

});
