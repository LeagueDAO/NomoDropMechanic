import { ContractReceipt, ContractTransaction, Signer } from 'ethers';
import { ethers } from "hardhat";
import { NFTAirdropMechanic, VRFCoordinatorMock } from '../../typechain';
import { testRandomNumber } from './constants';

export function getItemsFromEventArgs(txReceipt: ContractReceipt, eventName: string) {
    let storage: string[] = [];
    for (const event of txReceipt.events as Array<any>) {
        if (event.event == eventName) {
            for (const token of event?.args[0]) {
                storage.push(token.toString());
            }
        }
    }
    return storage;
}

export async function getBlockTimestamp() {
    const blockNumber = await ethers.provider.getBlockNumber()
    const block = await ethers.provider.getBlock(blockNumber)
    return block.timestamp;
}

export function shuffle(tokens: number[] | string[]) {
    let tempArr = [...tokens]
    let copy = [], n = tempArr.length, i;

    while (n) {
        i = Math.floor(Math.random() * tempArr.length);

        if (i in tempArr) {
            copy.push(tempArr[i]);
            delete tempArr[i];
            n--;
        }
    }

    return copy;
}

export async function addItemsToContract(itemsArray: (string | number)[], fn: ((items: any[]) => Promise<ContractTransaction>), type: string, showLogs: boolean) {
    let itemsPerTx = 100;
    const leftovers = itemsArray.length % itemsPerTx;
    const loops = (itemsArray.length - (itemsArray.length % itemsPerTx)) / itemsPerTx + 1;
    let txCounter = 0;

    for (let i = 0; i < itemsArray.length; i += itemsPerTx) {
        txCounter++;

        if (txCounter == loops) { itemsPerTx = leftovers; }

        const slice: any[] = itemsArray.slice(i, i + itemsPerTx);

        const addItemsToContractTx = await fn(slice);
        await addItemsToContractTx.wait();

        if (!showLogs) console.log(`Add ${type} tx: ${txCounter} has been executed successfully`);
    }
}

export async function simulateVRFCallback(nftAirdropMechanicContract: NFTAirdropMechanic, vrfCoordinator: VRFCoordinatorMock, signer: Signer) {
    const nftAirdropMechanicAddress = nftAirdropMechanicContract.address;
    await nftAirdropMechanicContract.connect(signer).getRandomValue();
    const requestId = await nftAirdropMechanicContract.lastRequestId();
    await vrfCoordinator.callBackWithRandomness(requestId, testRandomNumber, nftAirdropMechanicAddress);
}
