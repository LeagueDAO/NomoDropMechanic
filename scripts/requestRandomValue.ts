import hre, { ethers } from "hardhat";
import fs from 'fs';

export async function requestRandomValue() {
    const [deployer] = await hre.ethers.getSigners();

    console.log('Getting random value with the account:', deployer.address);
    console.log(`Account balance:  ${(await deployer.getBalance()).toString()} \n`);

    const contracts = JSON.parse(
        fs.readFileSync(`./contracts.json`, 'utf-8')
    );

    const nomoPlayersDropMechanic_Factory = await ethers.getContractFactory("NomoPlayersDropMechanic");
    const nomoPlayersDropMechanic = await nomoPlayersDropMechanic_Factory.attach(contracts.nomoPlayersDropMechanic);

    console.log(`Requesting random value from Chainlink VRF...`);

    try {
        const requestRandomValueTx = await nomoPlayersDropMechanic.getRandomValue();
        await requestRandomValueTx.wait();
    } catch (error) {
        console.log(error)
    }

    console.log("Random value was requested successfully!\n")
    console.log(`Account balance after requesting random value:  ${(await deployer.getBalance()).toString()} \n`);
}