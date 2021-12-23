const { expect } = require("chai");
import hre, { ethers, network } from "hardhat";
import fs from 'fs';
import { BigNumber, Signer, ContractFactory, ContractReceipt, ContractTransaction } from 'ethers';
import { ERC721Mock, NFTAirdropMechanic, StrategyMock, ERC20Mock, LinkToken } from '../typechain';
import { tokenPrice, collectibleItems, maxQuantity, testRandomNumber, testAddress, zeroAddress, TWO_MINS_IN_MILLIS, ONE_MIN, ONE_HOUR, TWO_HOURS, FOUR_HOURS, TEST_ADDRESSES } from './helpers/constants';
import { getItemsFromEventArgs, getBlockTimestamp, shuffle, addItemsToContract, simulateVRFCallback } from './helpers/helpers';

let deployer: Signer, deployerAddress: string;
let user: Signer, userAddress: string;
let daoWallet: Signer, daoWalletAddress: string;

const keyHash = "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4";
const fee = '1';
const eligibleAddressesCount = 270;
const privilegedAddressesCount = 117;
const eligibleAddresses = TEST_ADDRESSES.slice(0, eligibleAddressesCount);

async function setupSigners() {
  const accounts = await ethers.getSigners();
  deployer = accounts[0];
  deployerAddress = await accounts[0].getAddress();
  user = accounts[1];
  userAddress = await accounts[1].getAddress();
  daoWallet = accounts[2];
  daoWalletAddress = await accounts[2].getAddress();
}

describe("NFTAirdropMechanic tests", function () {
  let erc721Mock: ERC721Mock;
  let strategyMock: StrategyMock;
  let erc20Mock: ERC20Mock;
  let linkToken: any;
  let vrfCoordinator: any;
  let nftAirdropMechanicContract: NFTAirdropMechanic;
  let nftAirdropMechanicAddress: string;
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
      mintedTokens = [...mintedTokens, ...getItemsFromEventArgs(txReceiptCollectible, "LogCollectionMinted")];
    }

    let mintedTokensShuffled: (string | number)[] = shuffle(mintedTokens);

    expect(mintedTokensShuffled.length).not.to.equal(0);
    expect(addressERC721Mock).not.to.equal(zeroAddress);
    expect(addressStrategyMock).not.to.equal(zeroAddress);
    expect(addressERC20Mock).not.to.equal(zeroAddress);

    const nftAirdropMechanic_Factory: ContractFactory = await hre.ethers.getContractFactory("NFTAirdropMechanic");
    nftAirdropMechanicContract = await nftAirdropMechanic_Factory.deploy(
      addressERC721Mock,
      deployerAddress,
      tokenPrice,
      maxQuantity,
      vrfCoordinatorAddress,
      linkTokenAddress,
      keyHash,
      fee) as NFTAirdropMechanic;

    await nftAirdropMechanicContract.connect(deployer).deployed();

    nftAirdropMechanicAddress = nftAirdropMechanicContract.address;

    await hre.run("fund-link", { contract: nftAirdropMechanicAddress, linkaddress: linkTokenAddress });

    await addItemsToContract(mintedTokensShuffled, nftAirdropMechanicContract.functions["addTokensToCollection"], "tokens", true);

    await nftAirdropMechanicContract.setERC20Address(addressERC20Mock);
    await nftAirdropMechanicContract.setDaoWalletAddress(daoWalletAddress);
    await nftAirdropMechanicContract.setStrategyContractAddress(addressStrategyMock);
    await nftAirdropMechanicContract.setWhitelisted([userAddress]);

    await erc721Mock.setApprovalForAll(nftAirdropMechanicAddress, true, { from: deployerAddress });
  });

  it("should deploy NFTAirdropMechanic contract", async function () {
    expect(nftAirdropMechanicContract.address).to.not.equal(zeroAddress);
  });

  context("for tokens", () => {
    it("should emit LogTokensAdded event", async function () {
      // As long as there are already added tokens in `beforeEach` function with length of `collectibleItems`
      const collection: number[] = Array.from({ length: 10 }, (_, i) => i + (collectibleItems + 1));
      let shuffled = shuffle(collection);

      await expect(nftAirdropMechanicContract.connect(deployer).addTokensToCollection(shuffled)).to.emit(nftAirdropMechanicContract, "LogTokensAdded");
    });

    it("should add tokens", async function () {
      const collection: number[] = Array.from({ length: 10 }, (_, i) => i + (collectibleItems + 1));
      let shuffled = shuffle(collection);
      await nftAirdropMechanicContract.addTokensToCollection(shuffled);

      for (let i = 0; i < shuffled.length; i++) {
        const tokenId = shuffled[i];
        expect(await nftAirdropMechanicContract.addedTokens(tokenId)).to.be.true;
      }
    });

    it("should buy all tokens", async () => {
      // Deploy ERC721Mock, StrategyMock and ERC20Mock, and mint `n` tokens on `user` address who is also deployer of the ERC20Mock contract
      const tokensToBeBought = collectibleItems;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      const tokenBalanceBefore = await nftAirdropMechanicContract.getTokensLeft();

      // Approve nftAirdropMechanicContract to spend user's tokens
      await erc20Mock.connect(user).approve(nftAirdropMechanicAddress, value);

      let tokensPerTxBuy = maxQuantity;
      const leftoversToBuy = collectibleItems % tokensPerTxBuy;
      const loopsBuy = (collectibleItems - (collectibleItems % tokensPerTxBuy)) / tokensPerTxBuy + 1;
      let txCounterBuy = 0;

      for (let i = 0; i < collectibleItems; i += tokensPerTxBuy) {
        txCounterBuy++;
        if (txCounterBuy == loopsBuy) { tokensPerTxBuy = leftoversToBuy; }
        await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, user);
        await nftAirdropMechanicContract.connect(user).buyTokensOnSale(tokensPerTxBuy);
      }

      const tokenBalanceAfter = await nftAirdropMechanicContract.getTokensLeft();

      expect(tokenBalanceBefore).to.equal(tokensToBeBought);
      expect(tokenBalanceAfter).to.equal(0);
    }).timeout(TWO_MINS_IN_MILLIS);

    it("must fail to set tokens if token has been already added", async function () {
      const collection: number[] = [1];

      await expect(nftAirdropMechanicContract.connect(deployer).addTokensToCollection(collection))
        .to.be.revertedWith("Token has been already added");
    });

    it("must fail to set tokens if msg.sender isn't owner", async function () {
      const collection: number[] = [1];

      await expect(nftAirdropMechanicContract.connect(user).addTokensToCollection(collection))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set tokens if length tokens array is zero or less", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).addTokensToCollection([]))
        .to.be.revertedWith("Tokens array must include at least one item");
    });
  });

  context("for ERC20 address", () => {
    it("should emit LogERC20AddressSet event", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setERC20Address(testAddress)).to.emit(nftAirdropMechanicContract, "LogERC20AddressSet");
    });

    it("should set ERC20 address", async function () {
      await nftAirdropMechanicContract.connect(deployer).setERC20Address(testAddress);
      const erc20Address = await nftAirdropMechanicContract.connect(deployer).erc20Address();
      expect(testAddress).to.equal(erc20Address)
    });

    it("must fail to set ERC20 address if msg.sender isn't owner", async function () {
      await expect(nftAirdropMechanicContract.connect(user).setERC20Address(testAddress))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set ERC20 address isn't valid", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setERC20Address(zeroAddress))
        .to.be.revertedWith("Not a valid address!");
    });
  });

  context("for Strategy contract address", () => {
    it("should emit LogStrategyContractAddressSet event", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setStrategyContractAddress(testAddress)).to.emit(nftAirdropMechanicContract, "LogStrategyContractAddressSet");
    });

    it("should set Strategy contract address", async function () {
      await nftAirdropMechanicContract.connect(deployer).setStrategyContractAddress(testAddress);
      const strategyContractAddress = await nftAirdropMechanicContract.connect(deployer).strategyContractAddress();
      expect(testAddress).to.equal(strategyContractAddress)
    });

    it("must fail to set Strategy contract address if msg.sender isn't owner", async function () {
      await expect(nftAirdropMechanicContract.connect(user).setStrategyContractAddress(testAddress))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set Strategy contract address isn't valid", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setStrategyContractAddress(zeroAddress))
        .to.be.revertedWith("Not a valid address!");
    });
  });

  context("for Dao wallet address", () => {
    it("should emit LogDaoWalletAddressSet event", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setDaoWalletAddress(testAddress)).to.emit(nftAirdropMechanicContract, "LogDaoWalletAddressSet");
    });

    it("should set Dao wallet address", async function () {
      await nftAirdropMechanicContract.connect(deployer).setDaoWalletAddress(testAddress);
      const daoWalletAddress = await nftAirdropMechanicContract.connect(deployer).daoWalletAddress();
      expect(testAddress).to.equal(daoWalletAddress)
    });

    it("must fail to set Dao wallet address if msg.sender isn't owner", async function () {
      await expect(nftAirdropMechanicContract.connect(user).setDaoWalletAddress(testAddress))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set Dao wallet address isn't valid", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setDaoWalletAddress(zeroAddress))
        .to.be.revertedWith("Not a valid address!");
    });
  });

  context("for presale start date", () => {
    it("should set presale start date", async function () {
      const timestamp = await getBlockTimestamp();
      const TWO_DAYS = ONE_HOUR * 24 * 2;
      const unixStartDate = timestamp + TWO_DAYS;

      await nftAirdropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate);
      const presaleStartDate = await nftAirdropMechanicContract.connect(deployer).presaleStartDate();
      expect(unixStartDate).to.equal(presaleStartDate)
    });

    it("should emit LogPresaleStartDateSet event", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setPresaleStartDate(testAddress)).to.emit(nftAirdropMechanicContract, "LogPresaleStartDateSet");
    });

    it("must fail to set presale start date if msg.sender isn't owner", async function () {
      await expect(nftAirdropMechanicContract.connect(user).setPresaleStartDate(testAddress))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set presale start date if it's in the past", async function () {
      const timestamp = await getBlockTimestamp();
      const unixStartDate = timestamp - 1;
      await expect(nftAirdropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate))
        .to.be.revertedWith("Presale: start must be in future!");
    });
  });

  context("for presale duration", () => {
    it("should emit LogPresaleDurationSet event", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setPresaleDuration(testAddress)).to.emit(nftAirdropMechanicContract, "LogPresaleDurationSet");
    });

    it("should set presale duration", async function () {
      // Set presale duration to two hours
      await nftAirdropMechanicContract.connect(deployer).setPresaleDuration(TWO_HOURS);
      const presaleDurationSet = await nftAirdropMechanicContract.connect(deployer).presaleDuration();
      expect(TWO_HOURS).to.equal(presaleDurationSet)
    });

    it("must fail to set presale duration if msg.sender isn't owner", async function () {
      await expect(nftAirdropMechanicContract.connect(user).setPresaleDuration(testAddress))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set presale duration if presale duration is zero", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setPresaleDuration(0))
        .to.be.revertedWith("Presale: not a valid duration!");
    });
  });

  context("for initial tokens length", () => {
    it("should emit LogInitialTokensLengthSet event", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setInitialTokensLength(collectibleItems)).to.emit(nftAirdropMechanicContract, "LogInitialTokensLengthSet");
    })

    it("should set initial tokens length", async function () {
      await nftAirdropMechanicContract.connect(deployer).setInitialTokensLength(collectibleItems);
      const tokensLength = await nftAirdropMechanicContract.connect(deployer).initialTokensLength();
      expect(tokensLength).to.equal(collectibleItems)
    });

    it("must fail to initial tokens length if msg.sender isn't owner", async function () {
      await expect(nftAirdropMechanicContract.connect(user).setInitialTokensLength(collectibleItems))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to initial tokens length if initial tokens length is zero", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setInitialTokensLength(0))
        .to.be.revertedWith("must be above 0!");
    });
  })

  context("for whitelisted", () => {
    it("should emit LogWhitelistedSet event", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setWhitelisted([TEST_ADDRESSES[1]])).to.emit(nftAirdropMechanicContract, "LogWhitelistedSet");
    });

    it("should set whitelisted addresses", async function () {
      await addItemsToContract(TEST_ADDRESSES, nftAirdropMechanicContract.functions["setWhitelisted"], "addresses", true);

      let whitelistedAddresses = [];

      for (let i = 0; i < TEST_ADDRESSES.length; i++) {
        const whitelistedAddress = await nftAirdropMechanicContract.connect(deployer).whitelisted(TEST_ADDRESSES[i]);
        whitelistedAddresses.push(whitelistedAddress);
      }

      expect(whitelistedAddresses.includes(false)).to.equal(false)
    });

    it("must fail to set whitelisted if msg.sender isn't owner", async function () {
      await expect(nftAirdropMechanicContract.connect(user).setWhitelisted(TEST_ADDRESSES))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set whitelisted if whitelisted array does not have any addresses", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setWhitelisted([])).to.be.revertedWith("Beneficiaries array length must be in the bounds of 1 and 100");
    });

    it("must fail to set whitelisted if whitelisted array is over 100", async function () {
      const exceedingLimitNumberOfAddr = TEST_ADDRESSES.slice(0, 101);
      await expect(nftAirdropMechanicContract.connect(deployer).setWhitelisted(exceedingLimitNumberOfAddr)).to.be.revertedWith("Beneficiaries array length must be in the bounds of 1 and 100");
    });
  });

  context("for eligible", () => {
    it("should emit LogEligibleSet event", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setEligible([TEST_ADDRESSES[1]])).to.emit(nftAirdropMechanicContract, "LogEligibleSet");
    });

    it("should set eligible addresses", async function () {
      await addItemsToContract(TEST_ADDRESSES, nftAirdropMechanicContract.functions["setEligible"], "addresses", true);

      let eligibleAddresses = [];

      for (let i = 0; i < TEST_ADDRESSES.length; i++) {
        const eligibleAddress = await nftAirdropMechanicContract.connect(deployer).eligible(i);
        eligibleAddresses.push(eligibleAddress);
      }

      expect(eligibleAddresses.length).to.equal(TEST_ADDRESSES.length);
    });

    it("must fail to set eligible if msg.sender isn't owner", async function () {
      await expect(nftAirdropMechanicContract.connect(user).setEligible(TEST_ADDRESSES))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail to set whitelisted if whitelisted array does not have any addresses", async function () {
      await expect(nftAirdropMechanicContract.connect(deployer).setEligible([])).to.be.revertedWith("Eligible members array length must be in the bounds of 1 and 100");
    });

    it("must fail to set whitelisted if whitelisted array is over 100", async function () {
      const exceedingLimitNumberOfAddr = TEST_ADDRESSES.slice(0, 101);
      await expect(nftAirdropMechanicContract.connect(deployer).setEligible(exceedingLimitNumberOfAddr)).to.be.revertedWith("Eligible members array length must be in the bounds of 1 and 100");
    });
  });

  context("for random number", () => {
    it("should request random number", async function () {
      await expect(nftAirdropMechanicContract.connect(user).getRandomValue()).to.emit(nftAirdropMechanicContract, "LogRandomNumberRequested");
    });

    it("should save random number", async function () {
      await nftAirdropMechanicContract.connect(user).getRandomValue();
      const requestId = await nftAirdropMechanicContract.lastRequestId();
      await expect(vrfCoordinator.callBackWithRandomness(requestId, testRandomNumber, nftAirdropMechanicAddress)).to.emit(nftAirdropMechanicContract, "LogRandomNumberSaved");
    });

    it("must fail to get random number if token sale hasn't started", async function () {
      const timestamp = await getBlockTimestamp();
      const unixStartDate = timestamp + FOUR_HOURS;
      await nftAirdropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate);

      const tokensToBeApproved = 1;
      const value = BigNumber.from(tokensToBeApproved).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nftAirdropMechanicAddress, value);

      await expect(nftAirdropMechanicContract.connect(user).getRandomValue()).to.be.revertedWith("Current timestamp isn't on sale");
    });
  });

  context("for filtering users", () => {
    it("should filter users", async function () {
      await addItemsToContract(eligibleAddresses, nftAirdropMechanicContract.functions["setEligible"], "addresses", true);
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, deployer);

      const filterEligibleTx: ContractTransaction = await nftAirdropMechanicContract.connect(deployer).filterEligible(privilegedAddressesCount);
      const filterEligibleReceipt: ContractReceipt = await filterEligibleTx.wait();

      const selectedUsers = getItemsFromEventArgs(filterEligibleReceipt, "LogSelectedUsers")

      expect(selectedUsers.length).to.be.equal(privilegedAddressesCount);
    });

    it("must user tries to execute `filterEligible` instead of owner", async function () {
      await addItemsToContract(eligibleAddresses, nftAirdropMechanicContract.functions["setEligible"], "addresses", true);
      const fakePrivilegedMembersNumber = eligibleAddresses.length + 1;
      await expect(nftAirdropMechanicContract.connect(user).filterEligible(fakePrivilegedMembersNumber)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("must fail if random number is 0", async function () {
      await addItemsToContract(eligibleAddresses, nftAirdropMechanicContract.functions["setEligible"], "addresses", true);
      const fakePrivilegedMembersNumber = eligibleAddresses.length + 1;
      await expect(nftAirdropMechanicContract.filterEligible(fakePrivilegedMembersNumber)).to.be.revertedWith("Invalid random number");
    });

    it("must fail if filtering has been executed and random number is zero", async function () {
      await addItemsToContract(eligibleAddresses, nftAirdropMechanicContract.functions["setEligible"], "addresses", true);
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, deployer);
      await nftAirdropMechanicContract.filterEligible(privilegedAddressesCount);
      await expect(nftAirdropMechanicContract.filterEligible(privilegedAddressesCount)).to.be.revertedWith("Invalid random number");
    });

    it("must fail if eligible members are less than privileged", async function () {
      await addItemsToContract(eligibleAddresses, nftAirdropMechanicContract.functions["setEligible"], "addresses", true);
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, deployer);

      const fakePrivilegedCount = eligibleAddressesCount + 1;

      await expect(nftAirdropMechanicContract.filterEligible(fakePrivilegedCount)).to.be.revertedWith("Eligible members must be more than privileged");
    });
  });

  context("for airdrop", () => {
    it("should execute airdrop", async function () {
      await addItemsToContract(eligibleAddresses, nftAirdropMechanicContract.functions["setEligible"], "addresses", true);
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, deployer);

      const filterEligibleTx: ContractTransaction = await nftAirdropMechanicContract.connect(deployer).filterEligible(privilegedAddressesCount);
      const filterEligibleReceipt: ContractReceipt = await filterEligibleTx.wait();

      const selectedUsers = getItemsFromEventArgs(filterEligibleReceipt, "LogSelectedUsers");

      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, deployer);

      await nftAirdropMechanicContract.connect(deployer).executeAirdrop();

      for (let j = 0; j < eligibleAddresses.length; j++) {
        const currAddress = eligibleAddresses[j];
        const addressErc721Balance = await erc721Mock.balanceOf(currAddress);

        if (selectedUsers.includes(currAddress)) {
          expect(addressErc721Balance).to.equal(1);
        } else {
          expect(addressErc721Balance).to.equal(0);
        }
      }
    });

    it("must fail if random number is 0", async function () {
      await addItemsToContract(TEST_ADDRESSES, nftAirdropMechanicContract.functions["setEligible"], "addresses", true);
      await expect(nftAirdropMechanicContract.executeAirdrop()).to.be.revertedWith("Invalid random number");
    });

    it("must fail if airdrop has been already and random number is zero", async function () {
      await addItemsToContract(TEST_ADDRESSES, nftAirdropMechanicContract.functions["setEligible"], "addresses", true);

      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, deployer);
      await nftAirdropMechanicContract.connect(deployer).filterEligible(privilegedAddressesCount);

      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, deployer);
      await nftAirdropMechanicContract.connect(deployer).executeAirdrop();

      await expect(nftAirdropMechanicContract.executeAirdrop()).to.be.revertedWith("Invalid random number");
    });

    it("must fail if airdrop has been already executed", async function () {
      await addItemsToContract(TEST_ADDRESSES, nftAirdropMechanicContract.functions["setEligible"], "addresses", true);
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, deployer);
      await nftAirdropMechanicContract.connect(deployer).filterEligible(privilegedAddressesCount);
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, deployer);
      await nftAirdropMechanicContract.executeAirdrop();
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, deployer);
      await expect(nftAirdropMechanicContract.executeAirdrop()).to.be.revertedWith("Airdrop has been executed");
    });

    it("must fail to airdrop if tokens are less than eligible users", async function () {
      // Set addresses who will be given free ERC721, here eligible addresses are more than the tokens in the collection
      const TEST_ADDRESSES_EXTRA = TEST_ADDRESSES.slice();
      const TEST_ADDRESSES_DOUBLED = TEST_ADDRESSES_EXTRA.concat(TEST_ADDRESSES);

      await addItemsToContract(TEST_ADDRESSES_DOUBLED, nftAirdropMechanicContract.functions["setEligible"], "addresses", true);
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, deployer);
      await expect(nftAirdropMechanicContract.executeAirdrop()).to.be.revertedWith("Invalid airdrop parameters");
    });

    it("must fail to execute airdrop if eligible users aren't set", async function () {
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, deployer);
      await expect(nftAirdropMechanicContract.executeAirdrop()).to.be.revertedWith("Invalid airdrop parameters");
    });
  });

  context("for tokens purchasing on presale", () => {
    beforeEach(async function () {
      const timestamp = await getBlockTimestamp();
      const unixStartDate = timestamp + ONE_MIN;

      await nftAirdropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate);
      await nftAirdropMechanicContract.connect(deployer).setPresaleDuration(TWO_HOURS);

      const OVERTIME = ONE_HOUR;
      await network.provider.send("evm_increaseTime", [OVERTIME]); // Simulate presale has started
    });

    it("should buy tokens on presale from NFTAirdropMechanic contract", async function () {
      const isWhitelistedBefore = await nftAirdropMechanicContract.whitelisted(userAddress);
      const userFundsBefore = await erc20Mock.balanceOf(userAddress);
      const daoWalletFundsBefore = await erc20Mock.balanceOf(daoWalletAddress);
      const strategyFundsBefore = await erc20Mock.balanceOf(strategyMock.address);
      const userTokensBefore = await erc721Mock.balanceOf(userAddress);
      const tokenVaultQtyBefore = await erc721Mock.balanceOf(deployerAddress);

      const tokensToBeBought = 1;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nftAirdropMechanicAddress, value);

      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, user);
      await nftAirdropMechanicContract.connect(user).buyTokensOnPresale();

      const isWhitelistedAfter = await nftAirdropMechanicContract.connect(deployer).whitelisted(userAddress);
      const userTokensAfter = await erc721Mock.balanceOf(userAddress);
      const tokenVaultQtyAfter = await erc721Mock.balanceOf(deployerAddress);
      const userFundsAfter = await erc20Mock.balanceOf(userAddress);
      const daoWalletFundsAfter = await erc20Mock.balanceOf(daoWalletAddress);
      const strategyFundsAfter = await erc20Mock.balanceOf(strategyMock.address);
      const nftAirdropMechanicCollectibleLength = Number((await nftAirdropMechanicContract.getTokensLeft()).toString());

      expect(isWhitelistedBefore).to.equal(true);
      expect(isWhitelistedAfter).to.equal(false);
      expect(nftAirdropMechanicCollectibleLength).to.equal(collectibleItems - tokensToBeBought);
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
      const unixStartDate = timestamp + FOUR_HOURS;
      await nftAirdropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate);

      const tokensToBeApproved = 1;
      const value = BigNumber.from(tokensToBeApproved).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nftAirdropMechanicAddress, value);

      await expect(nftAirdropMechanicContract.connect(user).buyTokensOnPresale()).to.be.revertedWith("Current timestamp is not in the bounds of the presale period");
    });

    it("must fail if presale has ended", async function () {
      await network.provider.send("evm_increaseTime", [FOUR_HOURS]);

      const tokensToBeApproved = 1;
      const value = BigNumber.from(tokensToBeApproved).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nftAirdropMechanicAddress, value);

      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, user);
      await expect(nftAirdropMechanicContract.connect(user).buyTokensOnPresale()).to.be.revertedWith("Current timestamp is not in the bounds of the presale period");
    });

    it("must fail if user is not whitelisted", async function () {
      const tokensToBeApproved = 1;
      const value = BigNumber.from(tokensToBeApproved).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nftAirdropMechanicAddress, value);

      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, deployer);
      // Here we use `deployer` as a signer, who is not whitelisted in the presale
      await expect(nftAirdropMechanicContract.connect(deployer).buyTokensOnPresale()).to.be.revertedWith("Claiming is forbidden");
    });

    it("must fail if user has already claimed", async function () {
      // Approve 2 tokens 
      const tokensToBeApproved = 2;
      const value = BigNumber.from(tokensToBeApproved).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nftAirdropMechanicAddress, value);

      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, user);
      await nftAirdropMechanicContract.connect(user).buyTokensOnPresale();

      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, user);
      await expect(nftAirdropMechanicContract.connect(user).buyTokensOnPresale()).to.be.revertedWith("Claiming is forbidden");
    });
  });

  context("for tokens purchasing on sale", () => {
    it("should emit LogTokensBought event", async function () {
      const tokensToBeBought = 1;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nftAirdropMechanicAddress, value);
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, user);
      await expect(nftAirdropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought)).to.emit(nftAirdropMechanicContract, "LogTokensBought");
    });

    it("should buy tokens from NFTAirdropMechanic contract", async function () {
      const nomoBalanceBefore = await erc20Mock.balanceOf(nftAirdropMechanicAddress)

      const userFundsBefore = await erc20Mock.balanceOf(userAddress);
      const daoWalletFundsBefore = await erc20Mock.balanceOf(daoWalletAddress);
      const strategyFundsBefore = await erc20Mock.balanceOf(strategyMock.address);
      const userTokensBefore = await erc721Mock.balanceOf(userAddress);
      const tokenVaultQtyBefore = await erc721Mock.balanceOf(deployerAddress);

      let tokensToBeBought = maxQuantity;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nftAirdropMechanicAddress, value);
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, user);
      await nftAirdropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought);

      const nomoBalanceAfter = await erc20Mock.balanceOf(nftAirdropMechanicAddress)
      const userTokensAfter = await erc721Mock.balanceOf(userAddress);
      const tokenVaultQtyAfter = await erc721Mock.balanceOf(deployerAddress);
      const userFundsAfter = await erc20Mock.balanceOf(userAddress);
      const daoWalletFundsAfter = await erc20Mock.balanceOf(daoWalletAddress);
      const strategyFundsAfter = await erc20Mock.balanceOf(strategyMock.address);
      const nftAirdropMechanicCollectibleLength = Number((await nftAirdropMechanicContract.getTokensLeft()).toString());

      expect(nomoBalanceBefore).to.equal(0);
      expect(nomoBalanceBefore).to.equal(nomoBalanceAfter);
      expect(nftAirdropMechanicCollectibleLength).to.equal(collectibleItems - tokensToBeBought);
      expect(userFundsAfter).to.equal(userFundsBefore.sub(value));
      expect(strategyFundsBefore).to.equal(0);
      expect(daoWalletFundsAfter).to.equal(daoWalletFundsBefore.add(value.div(5)));
      expect(strategyFundsAfter).to.equal(value.div(5).mul(4));
      expect(tokenVaultQtyBefore).to.equal(collectibleItems);
      expect(tokenVaultQtyAfter).to.equal(collectibleItems - tokensToBeBought);
      expect(userTokensBefore).to.equal(0);
      expect(userTokensAfter).to.equal(tokensToBeBought);
    });

    it("must fail if random number is 0", async function () {
      await expect(nftAirdropMechanicContract.buyTokensOnSale(1)).to.be.revertedWith("Invalid random number");
    });

    it("must fail to buy tokens on sale before the actual sale has started", async function () {
      const timestamp = await getBlockTimestamp();
      const unixStartDate = timestamp + ONE_MIN;
      await nftAirdropMechanicContract.connect(deployer).setPresaleStartDate(unixStartDate);

      await nftAirdropMechanicContract.connect(deployer).setPresaleDuration(TWO_HOURS);

      await network.provider.send("evm_increaseTime", [ONE_HOUR]); // Simulate presale hasn't finished

      const tokensToBeBought = maxQuantity;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nftAirdropMechanicAddress, value);
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, user);
      await expect(nftAirdropMechanicContract.connect(user).buyTokensOnSale(7)).to.be.revertedWith("Sale period not started!");
    });

    it("must fail to deploy NFTAirdropMechanic contract if token price is zero", async () => {
      const { addressERC721MockTest } = await deployMockContracts();

      const NFTAirdropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NFTAirdropMechanic");
      const fakeTokenPrice = 0;

      await expect(NFTAirdropMechanic_Factory_Test.deploy(
        addressERC721MockTest,
        deployerAddress,
        fakeTokenPrice,
        maxQuantity,
        vrfCoordinatorAddress,
        linkTokenAddress,
        keyHash,
        fee) as Promise<NFTAirdropMechanic>).to.be.revertedWith('Token price must be higher than zero');
    });

    it("must fail to deploy NFTAirdropMechanic contract if maximum quantity is zero", async () => {
      const { addressERC721MockTest } = await deployMockContracts();

      const NFTAirdropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NFTAirdropMechanic");
      const fakeMaxQuantity = 0;

      await expect(NFTAirdropMechanic_Factory_Test.deploy(
        addressERC721MockTest,
        deployerAddress,
        tokenPrice,
        fakeMaxQuantity,
        vrfCoordinatorAddress,
        linkTokenAddress,
        keyHash,
        fee) as Promise<NFTAirdropMechanic>).to.be.revertedWith('Maximum quantity must be higher than zero');
    });

    it("must fail to deploy NFTAirdropMechanic contract if ERC721 address is not valid", async () => {
      const NFTAirdropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NFTAirdropMechanic");

      await expect(NFTAirdropMechanic_Factory_Test.deploy(
        zeroAddress,
        deployerAddress,
        tokenPrice,
        maxQuantity,
        vrfCoordinatorAddress,
        linkTokenAddress,
        keyHash,
        fee) as Promise<NFTAirdropMechanic>).to.be.revertedWith('Not a valid address!');
    });

    it("must fail if requested quantity is lower or equal to zero", async function () {
      const tokensToBeBought = 0;
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, user);
      await expect(nftAirdropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought))
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
        mintedTokens = [...mintedTokens, ...getItemsFromEventArgs(txReceiptCollectible, "LogCollectionMinted")];
      }

      let mintedTokensShuffled = shuffle(mintedTokens);

      const NFTAirdropMechanic_Factory_Test: ContractFactory = await hre.ethers.getContractFactory("NFTAirdropMechanic");
      const nftAirdropMechanicTestContract = await NFTAirdropMechanic_Factory_Test.deploy(
        addressERC721MockTest,
        deployerAddress,
        tokenPrice,
        maxQuantity,
        vrfCoordinatorAddress,
        linkTokenAddress,
        keyHash,
        fee) as NFTAirdropMechanic;
      await nftAirdropMechanicTestContract.connect(deployer).deployed();

      await addItemsToContract(mintedTokensShuffled, nftAirdropMechanicTestContract.functions["addTokensToCollection"], "tokens", true);

      await nftAirdropMechanicTestContract.setERC20Address(addressERC20MockTest);
      await nftAirdropMechanicTestContract.setDaoWalletAddress(daoWalletAddress);
      await nftAirdropMechanicTestContract.setStrategyContractAddress(addressStrategyMockTest);
      const nftAirdropMechanicTestAddress: string = nftAirdropMechanicTestContract.address;

      // Set approval for all tokens nftAirdropMechanicTestContract to distribute the items owned by ERC721Mock deployer
      await erc721MockTest.setApprovalForAll(nftAirdropMechanicTestAddress, true, { from: deployerAddress });

      // Approve nftAirdropMechanicTestContract to spend user's tokens
      await erc20MockTest.connect(user).approve(nftAirdropMechanicTestAddress, value);

      let tokensPerTxBuy = maxQuantity;
      const leftoversToBuy = collectibleItems % tokensPerTxBuy;
      const loopsBuy = (collectibleItems - (collectibleItems % tokensPerTxBuy)) / tokensPerTxBuy + 1;
      let txCounterBuy = 0;

      await hre.run("fund-link", { contract: nftAirdropMechanicTestAddress, linkaddress: linkTokenAddress });

      for (let i = 0; i < collectibleItems; i += tokensPerTxBuy) {
        txCounterBuy++;
        if (txCounterBuy == loopsBuy) { tokensPerTxBuy = leftoversToBuy; }
        await simulateVRFCallback(nftAirdropMechanicTestContract, vrfCoordinator, user);
        await nftAirdropMechanicTestContract.connect(user).buyTokensOnSale(tokensPerTxBuy);
      }

      await simulateVRFCallback(nftAirdropMechanicTestContract, vrfCoordinator, user);

      const tokensToBeBought2 = 1;
      const value2 = BigNumber.from(collectibleItems).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nftAirdropMechanicTestAddress, value2);

      await expect(nftAirdropMechanicTestContract.connect(user).buyTokensOnSale(tokensToBeBought2))
        .to.be.revertedWith("Insufficient available quantity");
    }).timeout(TWO_MINS_IN_MILLIS);

    it("must fail if requested quantity exceeds the limit", async function () {
      const tokensToBeBought = maxQuantity + 1;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nftAirdropMechanicAddress, value);
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, user);
      await expect(nftAirdropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought))
        .to.be.revertedWith("Invalid quantity");
    });

    it("must fail if NFTAirdropMechanic contract is not approved", async function () {
      await erc721Mock.setApprovalForAll(nftAirdropMechanicAddress, false, { from: deployerAddress });
      const tokensToBeBought = 3;
      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);
      await erc20Mock.connect(user).approve(nftAirdropMechanicAddress, value);
      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, user);
      await expect(nftAirdropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought))
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

      const value = BigNumber.from(tokensToBeBought).mul(tokenPrice);

      // Set approval for all tokens nftAirdropMechanicTestContract to distribute the items owned by ERC721Mock deployer
      await erc721Mock.setApprovalForAll(nftAirdropMechanicAddress, true, { from: deployerAddress });

      // Approve nftAirdropMechanicTestContract to spend user's tokens
      await erc20Mock.connect(user).approve(nftAirdropMechanicAddress, value);

      await simulateVRFCallback(nftAirdropMechanicContract, vrfCoordinator, user);
      await expect(nftAirdropMechanicContract.connect(user).buyTokensOnSale(tokensToBeBought))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");

      const userTokensAfter = await erc721Mock.balanceOf(userAddress);
      const tokenVaultQtyAfter = await erc721Mock.balanceOf(deployerAddress);
      const userFundsAfter = await erc20Mock.balanceOf(userAddress);
      const daoWalletFundsAfter = await erc20Mock.balanceOf(daoWalletAddress);
      const strategyFundsAfter = await erc20Mock.balanceOf(strategyMock.address);
      const nftAirdropMechanicCollectibleLength = Number((await nftAirdropMechanicContract.getTokensLeft()).toString());

      // The state of the balances must not have changed after, because of the reverted transacted
      expect(tokenVaultQtyBefore).to.equal(collectibleItems);
      expect(tokenVaultQtyAfter).to.equal(tokenVaultQtyBefore);
      expect(nftAirdropMechanicCollectibleLength).to.equal(collectibleItems);
      expect(userFundsAfter).to.equal(userFundsBefore);
      expect(strategyFundsBefore).to.equal(0);
      expect(strategyFundsAfter).to.equal(strategyFundsBefore);
      expect(daoWalletFundsAfter).to.equal(daoWalletFundsBefore);
      expect(userTokensBefore).to.equal(0);
      expect(userTokensAfter).to.equal(userTokensBefore);
    });
  });
});
