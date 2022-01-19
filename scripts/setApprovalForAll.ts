import hre from 'hardhat';
import fs from 'fs';
import config from './deployConfig/index';
import dotenv from 'dotenv';

const { coerceUndefined } = config;

dotenv.config();

export async function setApprovalForAll() {
    const [deployer] = await hre.ethers.getSigners();

    console.log('Setting approval with the account:', deployer.address);
    console.log(`Account balance:  ${(await deployer.getBalance()).toString()} \n`);

    const ERC721_ADDRESS = coerceUndefined(process.env.ERC721_ADDRESS);

    const contracts = JSON.parse(
        fs.readFileSync(`./contracts.json`, 'utf-8')
    );

    const ERC721_Factory = await hre.ethers.getContractFactory("ERC721Mock");
    const erc721 = await ERC721_Factory.attach(ERC721_ADDRESS);

    console.log('Approving contract...');

    try {
        const approvalTx = await erc721.setApprovalForAll(contracts.nomoPlayersDropMechanic, true);
        await approvalTx.wait();
    } catch (error) {
        console.log(error);
    }

    console.log(`${contracts.nomoPlayersDropMechanic} successfully approved by ${ERC721_ADDRESS}!`);
}