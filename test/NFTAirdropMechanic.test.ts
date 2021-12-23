const { expect } = require("chai");
import hre, { ethers, network } from "hardhat";
import fs from 'fs';
import { BigNumber, Signer, ContractFactory, ContractReceipt, ContractTransaction } from 'ethers';
import { ERC721Mock, NFTAirdropMechanic, StrategyMock, ERC20Mock } from '../typechain';
import { collectibleItems, testRandomNumber, zeroAddress, TEST_ADDRESSES } from './helpers/constants';
import { getItemsFromEventArgs, shuffle, addItemsToContract, simulateVRFCallback } from './helpers/helpers';

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
      vrfCoordinatorAddress,
      linkTokenAddress,
      keyHash,
      fee) as NFTAirdropMechanic;

    await nftAirdropMechanicContract.connect(deployer).deployed();

    nftAirdropMechanicAddress = nftAirdropMechanicContract.address;

    await hre.run("fund-link", { contract: nftAirdropMechanicAddress, linkaddress: linkTokenAddress });

    await addItemsToContract(mintedTokensShuffled, nftAirdropMechanicContract.functions["addTokensToCollection"], "tokens", true);

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

    it("must user tries to execute airdrop instead of owner", async function () {
      await addItemsToContract(TEST_ADDRESSES, nftAirdropMechanicContract.functions["setEligible"], "addresses", true);
      await expect(nftAirdropMechanicContract.connect(user).executeAirdrop()).to.be.revertedWith("Ownable: caller is not the owner");
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

});
