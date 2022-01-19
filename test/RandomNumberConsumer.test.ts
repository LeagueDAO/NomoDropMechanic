const { expect } = require("chai");
import hre from "hardhat";
import { ContractFactory } from 'ethers';

describe('RandomNumberConsumer', async function () {
    let randomNumberConsumer: any

    beforeEach(async () => {
        const LinkTokenFactory: ContractFactory = await hre.ethers.getContractFactory("LinkToken")
        const linkToken = await LinkTokenFactory.deploy()
        await linkToken.deployed();

        const linkTokenAddress = linkToken.address

        const VRFCoordinatorFactory: ContractFactory = await hre.ethers.getContractFactory("VRFCoordinatorMock")
        const vrfCoordinator = await VRFCoordinatorFactory.deploy(linkTokenAddress)
        await vrfCoordinator.deployed();
        const vrfCoordinatorAddress = vrfCoordinator.address

        const RandomNumberConsumerFactory: ContractFactory = await hre.ethers.getContractFactory("RandomNumberConsumer",)
        randomNumberConsumer = await RandomNumberConsumerFactory.deploy(vrfCoordinatorAddress, linkTokenAddress, "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4", '100000000000000000')
        await randomNumberConsumer.deployed();

        await hre.run("fund-link", { contract: randomNumberConsumer.address, linkaddress: linkTokenAddress })
    })

    it('should successfully make an external random number request', async () => {
        const transaction = await randomNumberConsumer.getRandomNumber()
        const tx_receipt = await transaction.wait(1)
        const requestId = tx_receipt.events[2].topics[1]

        expect(requestId).to.not.be.null
    }).timeout(2 * 60 * 1000);
})
