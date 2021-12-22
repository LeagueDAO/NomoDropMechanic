import hre from "hardhat";
import { ContractReceipt } from 'ethers';
import { ERC721Mock } from '../typechain';
import { ContractFactory } from 'ethers';
import dotenv from 'dotenv';
import { getItemsFromEventArgs, } from '../test/helpers/helpers';

dotenv.config();

export async function deployVerifyERC721() {
    // await hre.run('compile');
    // const [deployer] = await hre.ethers.getSigners();

    // console.log('Deploying contracts with the account:', deployer.address);
    // console.log(`Account balance:  ${(await deployer.getBalance()).toString()} \n`);

    // const ERC721Mock_Factory: ContractFactory = await hre.ethers.getContractFactory("ERC721Mock");
    // const erc721Mock = await ERC721Mock_Factory.connect(deployer).deploy() as ERC721Mock;
    // await erc721Mock.deployed();
    // const addressERC721Mock = erc721Mock.address;
    // console.log("ERC721 deployed with address: " + addressERC721Mock);

    // const collectibleItems = 90;

    // let tokensPerTxMint = 40;
    // const leftoversMint = collectibleItems % tokensPerTxMint;
    // const loopsMint = (collectibleItems - (collectibleItems % tokensPerTxMint)) / tokensPerTxMint + 1;
    // let txCounterMint = 0;

    // let mintedTokens: string[] = [];

    // for (let i = 0; i < collectibleItems; i += tokensPerTxMint) {
    //     txCounterMint++;
    //     if (txCounterMint == loopsMint) { tokensPerTxMint = leftoversMint; }
    //     const mintCollectionTx = await erc721Mock.connect(deployer).mintCollection(tokensPerTxMint);
    //     const txReceiptCollectible: ContractReceipt = await mintCollectionTx.wait();
    //     mintedTokens = [...mintedTokens, ...getItemsFromEventArgs(txReceiptCollectible, "LogCollectionMinted")];
    // }

    // console.log("Minted tokens:\n");
    // console.log(mintedTokens);
    // console.log("_____________");

    // verify NomoPlayersDropMechanic contract
    try {
        await hre.run('verify:verify', {
            address: "0x73C14a436482E709A847dEB72e06060d55950B52",
            constructorArguments: []
        });
    } catch (error: any) {
        console.log(error);
    }

    console.log('Done!');
}

