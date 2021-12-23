import hre, { ethers } from "hardhat";
import fs from 'fs';
import { getItemsFromEventArgs } from '../test/helpers/helpers';
import config from './deployConfig/index';
import dotenv from 'dotenv';

const { coerceUndefined } = config;

dotenv.config();

const GAS_LIMIT = '8000000'

export async function filterEligible() {
    const [deployer] = await hre.ethers.getSigners();
    const collectionLength = coerceUndefined(process.env.COLLECTION_LENGTH);
    console.log('Filtering with the account:', deployer.address);
    console.log(`Account balance:  ${(await deployer.getBalance()).toString()} \n`);

    const contracts = JSON.parse(
        fs.readFileSync(`./contracts.json`, 'utf-8')
    );

    const nftAirdropMechanic_Factory = await ethers.getContractFactory("NFTAirdropMechanic");
    const nftAirdropMechanic = await nftAirdropMechanic_Factory.attach(contracts.nftAirdropMechanic);

    console.log(`Filter eligible members array...`);

    const privilegedAddressesCount = 7;

    if (collectionLength != privilegedAddressesCount) {
        console.log("Collection length must be equal to privileged addresses!");
        return;
    }

    try {
        const filterEligibleTx = await nftAirdropMechanic.filterEligible(privilegedAddressesCount, { gasLimit: ethers.BigNumber.from(GAS_LIMIT) });
        const filterEligibleReceipt = await filterEligibleTx.wait();
        const selectedUsers = getItemsFromEventArgs(filterEligibleReceipt, "LogSelectedUsers");

        fs.writeFileSync('./selectedUsers.json', JSON.stringify({
            selected: selectedUsers
        }, null, 2));

    } catch (error) {
        console.log(error)
    }

    console.log("Filtering was executed successfully!\n")
    console.log(`Account balance after filtering:  ${(await deployer.getBalance()).toString()} \n`);
}

