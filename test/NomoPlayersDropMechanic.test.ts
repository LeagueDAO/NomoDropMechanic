const { expect } = require("chai");
import hre, { ethers, network } from "hardhat";
import fs from 'fs';
import { BigNumber, Signer, ContractFactory, ContractReceipt, ContractTransaction } from 'ethers';
import { ERC721Mock, NomoPlayersDropMechanic, StrategyMock, ERC20Mock } from '../typechain';
import { tokenPrice, collectibleItems, maxQuantity, testRandomNumber, testAddress, zeroAddress, TWO_MINS_IN_MILLIS, TEST_ADDRESSES } from './helpers/constants';
import { getTokensFromEventArgs, shuffle, addItemsToContract, simulateVRFCallback } from './helpers/helpers';

let deployer: Signer, deployerAddress: string;
let user: Signer, userAddress: string;
let daoWallet: Signer, daoWalletAddress: string;

const keyHash = "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4";
const fee = '1';

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
  let linkToken: any;
  let vrfCoordinator: any;
  let nomoPlayersDropMechanicContract: NomoPlayersDropMechanic;
  let nomoPlayersDropMechanicAddress: string;
  let linkTokenAddress: string;
  let vrfCoordinatorAddress: string;

  async function deployMockContracts(mintQty: number = 1000) {
    const ERC721Mock_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("ERC721Mock");
    const erc721MockTest = await ERC721Mock_Factory_Test.connect(deployer).deploy() as ERC721Mock;
    await erc721MockTest.deployed();
    const addressERC721MockTest: string = erc721MockTest.address;

    const ERC20_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("ERC20Mock");
    const erc20MockTest = await ERC20_Factory_Test.connect(user).deploy(mintQty) as ERC20Mock;
    await erc20MockTest.deployed();
    const addressERC20MockTest: string = erc20MockTest.address;

    const Strategy_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("StrategyMock");
    const strategyMockTest = await Strategy_Factory_Test.connect(deployer).deploy() as StrategyMock;
    await strategyMockTest.deployed();
    await strategyMockTest.setWantToken(addressERC20MockTest);
    const addressStrategyMockTest: string = strategyMockTest.address;

    return { erc721MockTest, addressERC721MockTest, addressStrategyMockTest, erc20MockTest, addressERC20MockTest };
  }

  before(async function () {
    await setupSigners();

    const LinkTokenFactory: ContractFactory = await hre.ethers.getContractFactory("LinkToken");
    linkToken = await LinkTokenFactory.deploy();
    await linkToken.deployed();
    linkTokenAddress = linkToken.address

    const VRFCoordinatorFactory: ContractFactory = await hre.ethers.getContractFactory("VRFCoordinatorMock");
    vrfCoordinator = await VRFCoordinatorFactory.deploy(linkTokenAddress);
    await vrfCoordinator.deployed();
    vrfCoordinatorAddress = vrfCoordinator.address;
  });

  beforeEach(async function () {
    const ERC721Mock_Factory: ContractFactory = await hre.ethers.getContractFactory("ERC721Mock");
    erc721Mock = await ERC721Mock_Factory.connect(deployer).deploy() as ERC721Mock;
    await erc721Mock.deployed();
    const addressERC721Mock = erc721Mock.address;

    const ERC20_Factory: ContractFactory = await hre.ethers.getContractFactory("ERC20Mock");
    const mintQty = 200000;
    erc20Mock = await ERC20_Factory.connect(user).deploy(mintQty) as ERC20Mock;
    await erc20Mock.deployed();
    const addressERC20Mock: string = erc20Mock.address;

    const Strategy_Factory: ContractFactory = await hre.ethers.getContractFactory("StrategyMock");
    strategyMock = await Strategy_Factory.connect(deployer).deploy() as StrategyMock;
    await strategyMock.deployed();
    await strategyMock.setWantToken(addressERC20Mock)

    const addressStrategyMock: string = strategyMock.address;

    let tokensPerTxMint = 40;
    const leftoversMint = collectibleItems % tokensPerTxMint;
    const loopsMint = (collectibleItems - (collectibleItems % tokensPerTxMint)) / tokensPerTxMint + 1;
    let txCounterMint = 0;

    let mintedTokens: string[] = [];

    for (let i = 0; i < collectibleItems; i += tokensPerTxMint) {
      txCounterMint++;
      if (txCounterMint == loopsMint) { tokensPerTxMint = leftoversMint; }
      const mintCollectionTx = await erc721Mock.connect(deployer).mintCollection(tokensPerTxMint);
      const txReceiptCollectible: ContractReceipt = await mintCollectionTx.wait();
      mintedTokens = [...mintedTokens, ...getTokensFromEventArgs(txReceiptCollectible, "LogCollectionMinted")];
    }

    let mintedTokensShuffled: (string | number)[] = shuffle(mintedTokens);

    expect(mintedTokensShuffled.length).not.to.equal(0);
    expect(addressERC721Mock).not.to.equal(zeroAddress);
    expect(addressStrategyMock).not.to.equal(zeroAddress);
    expect(addressERC20Mock).not.to.equal(zeroAddress);

    const NomoPlayersDropMechanic_Factory: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
    nomoPlayersDropMechanicContract = await NomoPlayersDropMechanic_Factory.deploy(
      addressERC721Mock,
      deployerAddress,
      tokenPrice,
      maxQuantity,
      vrfCoordinatorAddress,
      linkTokenAddress,
      keyHash,
      fee) as NomoPlayersDropMechanic;

    await nomoPlayersDropMechanicContract.connect(deployer).deployed();

    nomoPlayersDropMechanicAddress = nomoPlayersDropMechanicContract.address;

    await hre.run("fund-link", { contract: nomoPlayersDropMechanicAddress, linkaddress: linkTokenAddress });

    await addItemsToContract(mintedTokensShuffled, nomoPlayersDropMechanicContract.functions["addTokensToCollection"], "tokens", true);

    await nomoPlayersDropMechanicContract.setERC20Address(addressERC20Mock);
    await nomoPlayersDropMechanicContract.setDaoWalletAddress(daoWalletAddress);
    await nomoPlayersDropMechanicContract.setStrategyContractAddress(addressStrategyMock);

    await erc721Mock.setApprovalForAll(nomoPlayersDropMechanicAddress, true, { from: deployerAddress });
  });

  it("should deploy NomoPlayersDropMechanic contract", async function () {
    expect(nomoPlayersDropMechanicContract.address).to.not.equal(zeroAddress);
  });

  context("for tokens", () => {
    it("should emit LogTokensAdded event", async function () {
      // As long as there are already added tokens in `beforeEach` function with length of `collectibleItems`
      const collection: number[] = Array.from({ length: 10 }, (_, i) => i + (collectibleItems + 1));
      let shuffled = shuffle(collection);

      await expect(nomoPlayersDropMechanicContract.connect(deployer).addTokensToCollection(shuffled)).to.emit(nomoPlayersDropMechanicContract, "LogTokensAdded");
    });

    it("should add tokens", async function () {
      const collection: number[] = Array.from({ length: 10 }, (_, i) => i + (collectibleItems + 1));
      let shuffled = shuffle(collection);
      await nomoPlayersDropMechanicContract.addTokensToCollection(shuffled);

      for (let i = 0; i < shuffled.length; i++) {
        const tokenId = shuffled[i];
        expect(await nomoPlayersDropMechanicContract.addedTokens(tokenId)).to.be.true;
      }
    });

    it("should buy all tokens", async () => {
      // Deploy ERC721Mock, StrategyMock and ERC20Mock, and mint `n` tokens on `user` address who is also deployer of the ERC20Mock contract
      const tokensToBeBought = collectibleItems;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      const tokenBalanceBefore = await nomoPlayersDropMechanicContract.getTokensLeft();

      // Approve nomoPlayersDropMechanicContract to spend user's tokens
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);

      await addItemsToContract(TEST_ADDRESSES, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", true);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, deployer);
      await nomoPlayersDropMechanicContract.connect(deployer).executeAirdrop();

      const tokensAfterAirdrop = collectibleItems - TEST_ADDRESSES.length;
      let tokensPerTxBuy = maxQuantity;
      const leftoversToBuy = tokensAfterAirdrop % tokensPerTxBuy;
      const loopsBuy = (tokensAfterAirdrop - (tokensAfterAirdrop % tokensPerTxBuy)) / tokensPerTxBuy + 1;
      let txCounterBuy = 0;

      for (let i = 0; i < tokensAfterAirdrop; i += tokensPerTxBuy) {
        txCounterBuy++;
        if (txCounterBuy == loopsBuy) { tokensPerTxBuy = leftoversToBuy; }
        await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, user);
        await nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensPerTxBuy);
      }

      const tokenBalanceAfter = await nomoPlayersDropMechanicContract.getTokensLeft();

      expect(tokenBalanceBefore).to.equal(tokensToBeBought);
      expect(tokenBalanceAfter).to.equal(0);
    }).timeout(TWO_MINS_IN_MILLIS);

    it("must fail to set tokens if token has been already added", async function () {
      const collection: number[] = [1];

      await expect(nomoPlayersDropMechanicContract.connect(deployer).addTokensToCollection(collection))
        .to.be.revertedWith("Token has been already added");
    });

    it("must fail to set tokens if msg.sender isn't owner", async function () {
      const collection: number[] = [1];

      await expect(nomoPlayersDropMechanicContract.connect(user).addTokensToCollection(collection))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set tokens if length tokens array is zero or less", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).addTokensToCollection([]))
        .to.be.revertedWith("Tokens array must include at least one item");
    });
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

  context("for initial tokens length", () => {
    it("should emit LogInitialTokensLengthSet event", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setInitialTokensLength(collectibleItems)).to.emit(nomoPlayersDropMechanicContract, "LogInitialTokensLengthSet");
    })

    it("should set initial tokens length", async function () {
      await nomoPlayersDropMechanicContract.connect(deployer).setInitialTokensLength(collectibleItems);
      const tokensLength = await nomoPlayersDropMechanicContract.connect(deployer).initialTokensLength();
      expect(tokensLength).to.equal(collectibleItems)
    });

    it("must fail to initial tokens length if msg.sender isn't owner", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(user).setInitialTokensLength(collectibleItems))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to initial tokens length if initial tokens length is zero", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setInitialTokensLength(0))
        .to.be.revertedWith("must be above 0!");
    });
  })

  context("for privileged", () => {
    it("should emit LogPrivilegedSet event", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setPrivileged([TEST_ADDRESSES[1]])).to.emit(nomoPlayersDropMechanicContract, "LogPrivilegedSet");
    });

    it("should set privileged addresses", async function () {
      await addItemsToContract(TEST_ADDRESSES, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", true);

      let privilegedAddresses = [];

      for (let i = 0; i < TEST_ADDRESSES.length; i++) {
        const privilegedAddress = await nomoPlayersDropMechanicContract.connect(deployer).privileged(i);
        privilegedAddresses.push(privilegedAddress);
      }

      expect(privilegedAddresses.length).to.equal(TEST_ADDRESSES.length);
    });

    it("must fail to set privileged if msg.sender isn't owner", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(user).setPrivileged(TEST_ADDRESSES))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set whitelisted if whitelisted array does not have any addresses", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setPrivileged([])).to.be.revertedWith("Privileged members array length must be in the bounds of 1 and 100");
    });

    it("must fail to set whitelisted if whitelisted array is over 100", async function () {
      const exceedingLimitNumberOfAddr = TEST_ADDRESSES.slice(0, 101);
      await expect(nomoPlayersDropMechanicContract.connect(deployer).setPrivileged(exceedingLimitNumberOfAddr)).to.be.revertedWith("Privileged members array length must be in the bounds of 1 and 100");
    });
  });

  context("for random number", () => {
    it("should request random number", async function () {
      await expect(nomoPlayersDropMechanicContract.connect(user).getRandomValue())
        .to.emit(nomoPlayersDropMechanicContract, "LogRandomNumberRequested")
        .withArgs(userAddress);
    });

    it("should save random number", async function () {
      await nomoPlayersDropMechanicContract.connect(user).getRandomValue();
      const requestId = await nomoPlayersDropMechanicContract.lastRequestId();
      await expect(vrfCoordinator.callBackWithRandomness(requestId, testRandomNumber, nomoPlayersDropMechanicAddress))
        .to.emit(nomoPlayersDropMechanicContract, "LogRandomNumberSaved")
        .withArgs(userAddress);
    });

    it("should fail to request random number if random number is already saved", async function () {
      await nomoPlayersDropMechanicContract.connect(user).getRandomValue();
      const requestId = await nomoPlayersDropMechanicContract.lastRequestId();
      await vrfCoordinator.callBackWithRandomness(requestId, testRandomNumber, nomoPlayersDropMechanicAddress);

      await expect(nomoPlayersDropMechanicContract.connect(user).getRandomValue()).to.be.revertedWith("Random number already received");
    });
  });

  context("for airdrop", () => {
    it("should execute airdrop", async function () {
      await addItemsToContract(TEST_ADDRESSES, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", true);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, deployer);

      const txAirdrop: ContractTransaction = await nomoPlayersDropMechanicContract.executeAirdrop();
      const airdropReceipt: ContractReceipt = await txAirdrop.wait();

      const airdroppedTokens = getTokensFromEventArgs(airdropReceipt, "LogTokensAirdropped");

      expect(airdroppedTokens.length).to.be.equal(TEST_ADDRESSES.length);

      for (let j = 0; j < TEST_ADDRESSES.length; j++) {
        const currAddress = TEST_ADDRESSES[j];

        const addressErc721Balance = await erc721Mock.balanceOf(currAddress);
        expect(addressErc721Balance).to.equal(1);
      }

      expect(await nomoPlayersDropMechanicContract.isAirdropExecuted()).to.equal(true);
    });

    it("must fail if random number is 0", async function () {
      await addItemsToContract(TEST_ADDRESSES, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", true);
      await expect(nomoPlayersDropMechanicContract.executeAirdrop()).to.be.revertedWith("Invalid random number");
    });

    it("must fail if airdrop has been already executed", async function () {
      await addItemsToContract(TEST_ADDRESSES, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", true);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, deployer);
      await nomoPlayersDropMechanicContract.executeAirdrop();
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, deployer);
      await expect(nomoPlayersDropMechanicContract.executeAirdrop()).to.be.revertedWith("Airdrop has been executed");
    });

    it("must fail to airdrop if tokens are less than privileged users", async function () {
      // Set addresses who will be given free ERC721, here privileged addresses are more than the tokens in the collection
      const TEST_ADDRESSES_EXTRA = TEST_ADDRESSES.slice();
      const TEST_ADDRESSES_DOUBLED = TEST_ADDRESSES_EXTRA.concat(TEST_ADDRESSES);

      await addItemsToContract(TEST_ADDRESSES_DOUBLED, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", true);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, deployer);
      await expect(nomoPlayersDropMechanicContract.executeAirdrop()).to.be.revertedWith("Invalid airdrop parameters");
    });

    it("must fail to execute airdrop if privileged users aren't set", async function () {
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, deployer);
      await expect(nomoPlayersDropMechanicContract.executeAirdrop()).to.be.revertedWith("Invalid airdrop parameters");
    });
  });

  context("for tokens purchasing on sale", () => {
    it("should emit LogTokensBought event", async function () {
      const tokensToBeBought = 1;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);

      await addItemsToContract(TEST_ADDRESSES, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", true);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, deployer);
      await nomoPlayersDropMechanicContract.executeAirdrop();

      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, user);
      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought)).to.emit(nomoPlayersDropMechanicContract, "LogTokensBought");
    });

    it("should buy tokens from NomoPlayersDropMechanic contract", async function () {
      const nomoBalanceBefore = await erc20Mock.balanceOf(nomoPlayersDropMechanicAddress)

      const userFundsBefore = await erc20Mock.balanceOf(userAddress);
      const daoWalletFundsBefore = await erc20Mock.balanceOf(daoWalletAddress);
      const strategyFundsBefore = await erc20Mock.balanceOf(strategyMock.address);
      const userTokensBefore = await erc721Mock.balanceOf(userAddress);
      const tokenVaultQtyBefore = await erc721Mock.balanceOf(deployerAddress);

      let tokensToBeBought = maxQuantity;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);

      await addItemsToContract(TEST_ADDRESSES, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", true);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, deployer);
      await nomoPlayersDropMechanicContract.executeAirdrop();

      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, user);
      await nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought);

      const nomoBalanceAfter = await erc20Mock.balanceOf(nomoPlayersDropMechanicAddress)
      const userTokensAfter = await erc721Mock.balanceOf(userAddress);
      const tokenVaultQtyAfter = await erc721Mock.balanceOf(deployerAddress);
      const userFundsAfter = await erc20Mock.balanceOf(userAddress);
      const daoWalletFundsAfter = await erc20Mock.balanceOf(daoWalletAddress);
      const strategyFundsAfter = await erc20Mock.balanceOf(strategyMock.address);
      const nomoPlayersDropMechanicCollectibleLength = Number((await nomoPlayersDropMechanicContract.getTokensLeft()).toString());

      expect(nomoBalanceBefore).to.equal(0);
      expect(nomoBalanceBefore).to.equal(nomoBalanceAfter);
      expect(nomoPlayersDropMechanicCollectibleLength).to.equal(collectibleItems - tokensToBeBought - TEST_ADDRESSES.length);
      expect(userFundsAfter).to.equal(userFundsBefore.sub(value));
      expect(strategyFundsBefore).to.equal(0);
      expect(daoWalletFundsAfter).to.equal(daoWalletFundsBefore.add(value.div(5)));
      expect(strategyFundsAfter).to.equal(value.div(5).mul(4));
      expect(tokenVaultQtyBefore).to.equal(collectibleItems);
      expect(tokenVaultQtyAfter).to.equal(collectibleItems - tokensToBeBought - TEST_ADDRESSES.length);
      expect(userTokensBefore).to.equal(0);
      expect(userTokensAfter).to.equal(tokensToBeBought);
    });

    it("must fail if random number is 0", async function () {
      await expect(nomoPlayersDropMechanicContract.buyTokensOnSale(1)).to.be.revertedWith("Invalid random number");
    });

    it("must fail if airdrop hasn't been executed", async function () {
      const tokensToBeBought = maxQuantity + 1;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);

      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, user);
      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought))
        .to.be.revertedWith("Airdrop has not been executed!");
    });

    it("must fail to buy tokens if airdrop executor tries to buy without requesting random number", async function () {
      await addItemsToContract(TEST_ADDRESSES, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", true);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, deployer);
      await nomoPlayersDropMechanicContract.connect(deployer).executeAirdrop();

      expect(await nomoPlayersDropMechanicContract.isAirdropExecuted()).to.equal(true);
      await expect(nomoPlayersDropMechanicContract.buyTokensOnSale(1)).to.be.revertedWith("Invalid random number");
    });

    it("must fail to deploy NomoPlayersDropMechanic contract if token price is zero", async () => {
      const { addressERC721MockTest } = await deployMockContracts();

      const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
      const fakeTokenPrice = 0;

      await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
        addressERC721MockTest,
        deployerAddress,
        fakeTokenPrice,
        maxQuantity,
        vrfCoordinatorAddress,
        linkTokenAddress,
        keyHash,
        fee) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Token price must be higher than zero');
    });

    it("must fail to deploy NomoPlayersDropMechanic contract if maximum quantity is zero", async () => {
      const { addressERC721MockTest } = await deployMockContracts();

      const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
      const fakeMaxQuantity = 0;

      await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
        addressERC721MockTest,
        deployerAddress,
        tokenPrice,
        fakeMaxQuantity,
        vrfCoordinatorAddress,
        linkTokenAddress,
        keyHash,
        fee) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Maximum quantity must be higher than zero');
    });

    it("must fail to deploy NomoPlayersDropMechanic contract if ERC721 address is not valid", async () => {
      const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");

      await expect(NomoPlayersDropMechanic_Factory_Test.deploy(
        zeroAddress,
        deployerAddress,
        tokenPrice,
        maxQuantity,
        vrfCoordinatorAddress,
        linkTokenAddress,
        keyHash,
        fee) as Promise<NomoPlayersDropMechanic>).to.be.revertedWith('Not a valid address!');
    });

    it("must fail if requested quantity is lower or equal to zero", async function () {
      await addItemsToContract(TEST_ADDRESSES, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", true);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, deployer);
      await nomoPlayersDropMechanicContract.connect(deployer).executeAirdrop();

      const tokensToBeBought = 0;
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, user);
      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought))
        .to.be.revertedWith("Invalid quantity");
    });

    it("must fail if quantity is higher than the items in the collection", async function () {
      // Deploy ERC721Mock, StrategyMock and ERC20Mock, and mint `n` tokens on `user` address who is also deployer of the ERC20Mock contract
      const tokensToBeBought = collectibleItems;
      const tokensToBeMinted = 10000;
      const { erc721MockTest, addressERC721MockTest, addressStrategyMockTest, erc20MockTest, addressERC20MockTest } = await deployMockContracts(tokensToBeMinted);

      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);

      let tokensPerTxMint = 40;
      const leftoversMint = collectibleItems % tokensPerTxMint;
      const loopsMint = (collectibleItems - (collectibleItems % tokensPerTxMint)) / tokensPerTxMint + 1;
      let txCounterMint = 0;

      let mintedTokens: string[] = [];

      for (let i = 0; i < collectibleItems; i += tokensPerTxMint) {
        txCounterMint++;
        if (txCounterMint == loopsMint) { tokensPerTxMint = leftoversMint; }
        const mintCollectionTx = await erc721MockTest.connect(deployer).mintCollection(tokensPerTxMint);
        const txReceiptCollectible: ContractReceipt = await mintCollectionTx.wait();
        mintedTokens = [...mintedTokens, ...getTokensFromEventArgs(txReceiptCollectible, "LogCollectionMinted")];
      }

      let mintedTokensShuffled = shuffle(mintedTokens);

      const NomoPlayersDropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
      const nomoPlayersDropMechanicTestContract = await NomoPlayersDropMechanic_Factory_Test.deploy(
        addressERC721MockTest,
        deployerAddress,
        tokenPrice,
        maxQuantity,
        vrfCoordinatorAddress,
        linkTokenAddress,
        keyHash,
        fee) as NomoPlayersDropMechanic;
      await nomoPlayersDropMechanicTestContract.connect(deployer).deployed();

      await addItemsToContract(mintedTokensShuffled, nomoPlayersDropMechanicTestContract.functions["addTokensToCollection"], "tokens", true);

      await nomoPlayersDropMechanicTestContract.setERC20Address(addressERC20MockTest);
      await nomoPlayersDropMechanicTestContract.setDaoWalletAddress(daoWalletAddress);
      await nomoPlayersDropMechanicTestContract.setStrategyContractAddress(addressStrategyMockTest);
      const nomoPlayersDropMechanicTestAddress: string = nomoPlayersDropMechanicTestContract.address;

      // Set approval for all tokens nomoPlayersDropMechanicTestContract to distribute the items owned by ERC721Mock deployer
      await erc721MockTest.setApprovalForAll(nomoPlayersDropMechanicTestAddress, true, { from: deployerAddress });

      // Approve nomoPlayersDropMechanicTestContract to spend user's tokens
      await erc20MockTest.connect(user).approve(nomoPlayersDropMechanicTestAddress, value);

      let tokensPerTxBuy = maxQuantity;
      const leftoversToBuy = collectibleItems % tokensPerTxBuy;
      const loopsBuy = (collectibleItems - (collectibleItems % tokensPerTxBuy)) / tokensPerTxBuy + 1;
      let txCounterBuy = 0;

      await hre.run("fund-link", { contract: nomoPlayersDropMechanicTestAddress, linkaddress: linkTokenAddress });

      await addItemsToContract(TEST_ADDRESSES, nomoPlayersDropMechanicTestContract.functions["setPrivileged"], "addresses", true);
      await simulateVRFCallback(nomoPlayersDropMechanicTestContract, vrfCoordinator, deployer);
      await nomoPlayersDropMechanicTestContract.executeAirdrop();

      const tokensAfterAirdrop = collectibleItems - TEST_ADDRESSES.length;

      for (let i = 0; i < tokensAfterAirdrop; i += tokensPerTxBuy) {
        txCounterBuy++;
        if (txCounterBuy == loopsBuy) { tokensPerTxBuy = leftoversToBuy; }
        await simulateVRFCallback(nomoPlayersDropMechanicTestContract, vrfCoordinator, user);
        await nomoPlayersDropMechanicTestContract.connect(user).buyTokensOnSale(tokensPerTxBuy);
      }

      await simulateVRFCallback(nomoPlayersDropMechanicTestContract, vrfCoordinator, user);

      const tokensToBeBought2 = 1;
      const value2 = BigNumber.from(collectibleItems).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicTestAddress, value2);

      await expect(nomoPlayersDropMechanicTestContract.connect(user).buyTokensOnSale(tokensToBeBought2))
        .to.be.revertedWith("Insufficient available quantity");
    }).timeout(TWO_MINS_IN_MILLIS);

    it("must fail if requested quantity exceeds the limit", async function () {
      await addItemsToContract(TEST_ADDRESSES, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", true);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, deployer);
      await nomoPlayersDropMechanicContract.connect(deployer).executeAirdrop();

      const tokensToBeBought = maxQuantity + 1;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, user);
      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought))
        .to.be.revertedWith("Invalid quantity");
    });

    it("must fail if NomoPlayersDropMechanic contract is not approved", async function () {
      await addItemsToContract(TEST_ADDRESSES, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", true);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, deployer);
      await nomoPlayersDropMechanicContract.executeAirdrop();

      const tokensToBeBought = 3;
      const value = BigNumber.from(tokensToBeBought + TEST_ADDRESSES.length).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);;

      await erc721Mock.setApprovalForAll(nomoPlayersDropMechanicAddress, false, { from: deployerAddress });

      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, user);
      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought))
        .to.be.revertedWith('ERC721: transfer caller is not owner nor approved');
    });

    it("must fail if user doesn't have enough ERC20 tokens", async function () {
      let tokensToBeBought = maxQuantity;

      // Transfer all tokens to deployer 
      await erc20Mock.transfer(deployerAddress, await erc20Mock.balanceOf(userAddress));

      const userFundsBefore = await erc20Mock.balanceOf(userAddress);
      const tokenVaultQtyBefore = await erc721Mock.balanceOf(deployerAddress);
      const daoWalletFundsBefore = await erc20Mock.balanceOf(daoWalletAddress);
      const strategyFundsBefore = await erc20Mock.balanceOf(strategyMock.address);
      const userTokensBefore = await erc721Mock.balanceOf(userAddress);

      const value = BigNumber.from(tokensToBeBought + TEST_ADDRESSES.length).mul(tokenPrice);

      // Set approval for all tokens nomoPlayersDropMechanicTestContract to distribute the items owned by ERC721Mock deployer
      await erc721Mock.setApprovalForAll(nomoPlayersDropMechanicAddress, true, { from: deployerAddress });

      // Approve nomoPlayersDropMechanicTestContract to spend user's tokens
      await erc20Mock.connect(user).approve(nomoPlayersDropMechanicAddress, value);

      await addItemsToContract(TEST_ADDRESSES, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", true);
      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, deployer);
      await nomoPlayersDropMechanicContract.connect(deployer).executeAirdrop();

      await simulateVRFCallback(nomoPlayersDropMechanicContract, vrfCoordinator, user);
      await expect(nomoPlayersDropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");

      const userTokensAfter = await erc721Mock.balanceOf(userAddress);
      const tokenVaultQtyAfter = await erc721Mock.balanceOf(deployerAddress);
      const userFundsAfter = await erc20Mock.balanceOf(userAddress);
      const daoWalletFundsAfter = await erc20Mock.balanceOf(daoWalletAddress);
      const strategyFundsAfter = await erc20Mock.balanceOf(strategyMock.address);
      const nomoPlayersDropMechanicCollectibleLength = Number((await nomoPlayersDropMechanicContract.getTokensLeft()).toString());

      // The state of the balances must not have changed after, because of the reverted transacted
      expect(tokenVaultQtyBefore).to.equal(collectibleItems);
      expect(tokenVaultQtyAfter).to.equal(+tokenVaultQtyBefore - TEST_ADDRESSES.length);
      expect(nomoPlayersDropMechanicCollectibleLength).to.equal(collectibleItems - TEST_ADDRESSES.length);
      expect(userFundsAfter).to.equal(userFundsBefore);
      expect(strategyFundsBefore).to.equal(0);
      expect(strategyFundsAfter).to.equal(strategyFundsBefore);
      expect(daoWalletFundsAfter).to.equal(daoWalletFundsBefore);
      expect(userTokensBefore).to.equal(0);
      expect(userTokensAfter).to.equal(userTokensBefore);
    });
  });
});
