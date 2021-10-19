const { expect } = require("chai");
import hre, { ethers } from "hardhat";
import { ERC721Mock } from '../typechain';
import { Signer, ContractFactory } from 'ethers';
import { zeroAddress } from "./helpers/constants";

let deployer: Signer, deployerAddress: string;
let user: Signer, userAddress: string;

async function setupSigners() {
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    deployerAddress = await accounts[0].getAddress();
    user = accounts[1];
    userAddress = await accounts[1].getAddress();
}

describe("ERC721Mock tests", function () {
    let erc721Mock: ERC721Mock;
    let collectibleItems: number = 20;

    before(async function () {
        await setupSigners();
        const ERC721Mock_Factory: ContractFactory = await hre.ethers.getContractFactory("ERC721Mock");
        erc721Mock = await ERC721Mock_Factory.deploy() as ERC721Mock;
        await erc721Mock.connect(deployer).deployed();
    });

    it("should deploy ERC721Mock contract", async function () {
        expect(erc721Mock.address).to.not.equal(zeroAddress);
    });

    it("should create collectible in ERC721Mock contract", async function () {
        const userBalance = await erc721Mock.balanceOf(userAddress);

        await expect(erc721Mock.connect(deployer).mintCollection(collectibleItems)).to.emit(erc721Mock, "LogCollectionMinted");

        const collectibleLength = await erc721Mock.totalSupply();
        const deployerBalanceAfter = await erc721Mock.balanceOf(deployerAddress);

        expect(collectibleLength).to.equal(collectibleItems);
        expect(deployerBalanceAfter).to.equal(collectibleItems);
        expect(userBalance).to.equal(0);
    });

    it("must fail to mint collection if quantity is above 40", async () => {
        const collectibleItemsTest = 41;
        await expect(erc721Mock.connect(deployer).mintCollection(collectibleItemsTest))
            .to.be.revertedWith("The requested quantity exceeds the limit.");
    });
});