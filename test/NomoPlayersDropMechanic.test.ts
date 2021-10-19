const { expect } = require("chai");
import hre, { ethers } from "hardhat";
import { ERC721Mock, NomoPlayersDropMechanic, StrategyMock } from '../typechain';
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
  let nomoPlayersDropMechanicContract: NomoPlayersDropMechanic;
  let nomoPlayersDropMechanicAddress: string;

  async function deployMockContracts() {
    const ERC721Mock_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("ERC721Mock");
    const erc721MockTest = await ERC721Mock_Factory_Test.deploy() as ERC721Mock;
    await erc721MockTest.connect(deployer).deployed();
    const addressERC721MockTest = erc721MockTest.address;

    const Strategy_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("StrategyMock");
    const strategyMockTest = await Strategy_Factory_Test.deploy() as StrategyMock;
    await strategyMockTest.connect(deployer).deployed();
    const addressStrategyMockTest = strategyMockTest.address;

    return { addressERC721MockTest, addressStrategyMockTest };
  }

  before(async function () {
    await setupSigners();
  });

  beforeEach(async function () {
    const ERC721Mock_Factory: ContractFactory = await hre.ethers.getContractFactory("ERC721Mock");
    erc721Mock = await ERC721Mock_Factory.deploy() as ERC721Mock;
    await erc721Mock.connect(deployer).deployed();
    const addressERC721Mock = erc721Mock.address;

    const Strategy_Factory: ContractFactory = await hre.ethers.getContractFactory("StrategyMock");
    strategyMock = await Strategy_Factory.deploy() as StrategyMock;
    await strategyMock.connect(deployer).deployed();
    const addressStrategyMock = strategyMock.address;

    const mintCollectionTx = await erc721Mock.connect(deployer).mintCollection(collectibleItems);
    const txReceiptCollectible: ContractReceipt = await mintCollectionTx.wait();

    const mintedTokens: string[] = getTokensFromEventArgs(txReceiptCollectible, "LogCollectionMinted");

    expect(mintedTokens.length).not.to.equal(0);
    expect(addressERC721Mock).not.to.equal(zeroAddress);
    expect(addressStrategyMock).not.to.equal(zeroAddress);

    const NomoPlayersDropMechanic_Factory: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    nomoPlayersDropMechanicContract = await NomoPlayersDropMechanic_Factory.deploy(
      mintedTokens,
      tokenPrice,
      maxQuantity,
      addressERC721Mock,
      daoWalletAddress,
      addressStrategyMock,
      deployerAddress) as NomoPlayersDropMechanic;
    await nomoPlayersDropMechanicContract.connect(deployerAddress).deployed();

    nomoPlayersDropMechanicAddress = nomoPlayersDropMechanicContract.address;

    await erc721Mock.setApprovalForAll(nomoPlayersDropMechanicAddress, true, { from: deployerAddress });
  });

  it("should deploy NomoPlayersDropMechanic contract", async function () {
    expect(nomoPlayersDropMechanicContract.address).to.not.equal(zeroAddress);
  });

  it("should buy tokens from NomoPlayersDropMechanic contract", async function () {
    const userFundsBefore = await ethers.provider.getBalance(userAddress);
    const daoWalletFundsBefore = await ethers.provider.getBalance(daoWalletAddress);
    const strategyFundsBefore = await strategyMock.getBalance();
    const userTokensBefore = await erc721Mock.balanceOf(userAddress);
    const deployerFundsBefore = await erc721Mock.balanceOf(deployerAddress);
    const tokensToBeBought = 10;
    const msgValue = BigNumber.from(tokensToBeBought).mul(tokenPrice);

    const buyTokensTx: ContractTransaction = await nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought, { value: msgValue });
    await buyTokensTx.wait();

    const userTokensAfter = await erc721Mock.balanceOf(userAddress);
    const deployerFundsAfter = await erc721Mock.balanceOf(deployerAddress);
    const userFundsAfter = await ethers.provider.getBalance(userAddress);
    const daoWalletFundsAfter = await ethers.provider.getBalance(daoWalletAddress);
    const strategyFundsAfter = await strategyMock.getBalance();
    const nomoPlayersDropMechanicCollectibleLength = Number((await nomoPlayersDropMechanicContract.getTokensLeft()).toString());

    expect(nomoPlayersDropMechanicCollectibleLength).to.equal(collectibleItems - tokensToBeBought);
    expect(userFundsAfter).to.not.equal(userFundsBefore.sub(tokensToBeBought));
    expect(strategyFundsBefore).to.equal(0);
    expect(daoWalletFundsAfter).to.equal(daoWalletFundsBefore.add(msgValue.div(5).mul(1)));
    expect(strategyFundsAfter).to.equal(msgValue.div(5).mul(4));
    expect(deployerFundsBefore).to.equal(collectibleItems);
    expect(deployerFundsAfter).to.equal(collectibleItems - tokensToBeBought);
    expect(userTokensBefore).to.equal(0);
    expect(userTokensAfter).to.equal(tokensToBeBought);
  });

  it("should emit LogTokensBought event", async function () {
    const tokensToBeBought = 1;
    const msgValue = BigNumber.from(tokensToBeBought).mul(tokenPrice);
    await expect(nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought, { value: msgValue })).to.emit(nomoPlayersDropMechanicContract, "LogTokensBought");
  });

  it("must fail to deploy NomoPlayersDropMechanic contract if tokens array is empty", async () => {
    const { addressERC721MockTest, addressStrategyMockTest } = await deployMockContracts();

    const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");

    await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
      [],
      tokenPrice,
      maxQuantity,
      addressERC721MockTest,
      daoWalletAddress,
      addressStrategyMockTest,
      deployerAddress) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith("Tokens array must include at least one item");
  });

  it("must fail to deploy NomoPlayersDropMechanic contract if token price is zero", async () => {
    const { addressERC721MockTest, addressStrategyMockTest } = await deployMockContracts();

    const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    const mintedTokensTest: number[] = Array.from({ length: 100 }, (_, i) => i + 1);
    const fakeTokenPrice = 0;

    await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
      mintedTokensTest,
      fakeTokenPrice,
      maxQuantity,
      addressERC721MockTest,
      daoWalletAddress,
      addressStrategyMockTest,
      deployerAddress) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Token price must be higher than zero');
  });

  it("must fail to deploy NomoPlayersDropMechanic contract if maximum quantity is zero", async () => {
    const { addressERC721MockTest, addressStrategyMockTest } = await deployMockContracts();

    const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    const mintedTokensTest: number[] = Array.from({ length: 100 }, (_, i) => i + 1);
    const fakeMaxQuantity = 0;

    await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
      mintedTokensTest,
      tokenPrice,
      fakeMaxQuantity,
      addressERC721MockTest,
      daoWalletAddress,
      addressStrategyMockTest,
      deployerAddress) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Maximum quantity must be higher than zero');
  });

  it("must fail to deploy NomoPlayersDropMechanic contract if ERC721 address is not valid", async () => {
    const { addressStrategyMockTest } = await deployMockContracts();

    const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    const mintedTokensTest: number[] = Array.from({ length: 100 }, (_, i) => i + 1);

    await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
      mintedTokensTest,
      tokenPrice,
      maxQuantity,
      zeroAddress,
      daoWalletAddress,
      addressStrategyMockTest,
      deployerAddress) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Not valid address');
  });

  it("must fail to deploy NomoPlayersDropMechanic contract if Dao address is not valid", async () => {
    const { addressERC721MockTest } = await deployMockContracts();

    const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    const mintedTokensTest: number[] = Array.from({ length: 100 }, (_, i) => i + 1);

    await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
      mintedTokensTest,
      tokenPrice,
      maxQuantity,
      addressERC721MockTest,
      daoWalletAddress,
      zeroAddress,
      deployerAddress) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Not valid address');
  });

  it("must fail to deploy NomoPlayersDropMechanic contract if Strategy contract address is not valid", async () => {
    const { addressERC721MockTest, addressStrategyMockTest } = await deployMockContracts();

    const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    const mintedTokensTest: number[] = Array.from({ length: 100 }, (_, i) => i + 1);

    await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
      mintedTokensTest,
      tokenPrice,
      maxQuantity,
      addressERC721MockTest,
      zeroAddress,
      addressStrategyMockTest,
      deployerAddress) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Not valid address');
  });

  it("must fail if requested quantity is lower or equal to zero", async function () {
    const tokensToBeBought = 0;
    const msgValue = BigNumber.from(tokensToBeBought).mul(tokenPrice);
    await expect(nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought, { value: msgValue }))
      .to.be.revertedWith("Invalid quantity");
  });

  it("must fail if quantity is higher than the items in the collection", async function () {
    const tokensToBeBought1 = 20;
    const msgValue1 = BigNumber.from(tokensToBeBought1).mul(tokenPrice);

    await nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought1, { value: msgValue1 });

    const tokensToBeBought2 = 6;
    const msgValue2 = BigNumber.from(tokensToBeBought2).mul(tokenPrice);
    await expect(nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought2, { value: msgValue2 }))
      .to.be.revertedWith("Insufficient available quantity");
  });

  it("must fail if requested quantity exceeds the limit", async function () {
    const tokensToBeBought = 21;
    const msgValue = BigNumber.from(tokensToBeBought).mul(tokenPrice);
    await expect(nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought, { value: msgValue }))
      .to.be.revertedWith("Invalid quantity");
  });

  it("must fail if NomoPlayersDropMechanic contract is not approved", async function () {
    await erc721Mock.setApprovalForAll(nomoPlayersDropMechanicAddress, false, { from: deployerAddress });
    const tokensToBeBought = 10;
    const msgValue = BigNumber.from(tokensToBeBought).mul(tokenPrice);
    await expect(nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought, { value: msgValue }))
      .to.be.revertedWith('ERC721: transfer caller is not owner nor approved');
  });

  it("must fail if sent value is insufficient", async function () {
    const tokensToBeBought = 10;
    const fakeQuantity = 9; // force failure
    const msgValue = BigNumber.from(fakeQuantity).mul(tokenPrice);
    await expect(nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought, { value: msgValue }))
      .to.be.revertedWith("Invalid funds sent");
  });

  it("must fail if sent value is higher than expected", async function () {
    const tokensToBeBought = 10;
    const fakeQuantity = 11; // force failure
    const msgValue = BigNumber.from(fakeQuantity).mul(tokenPrice);
    await expect(nomoPlayersDropMechanicContract.connect(user).buyTokens(tokensToBeBought, { value: msgValue }))
      .to.be.revertedWith("Invalid funds sent");
  });

});
