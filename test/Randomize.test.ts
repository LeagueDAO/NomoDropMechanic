const { expect } = require("chai");
import hre, { ethers } from "hardhat";
import { NomoPlayersDropMechanicMock } from '../typechain';
import { Signer, ContractFactory, ContractReceipt } from 'ethers';
import { getTokensFromEventArgs } from './helpers/helpers';

let deployer: Signer, deployerAddress: string;
let user: Signer, userAddress: string;

async function setupSigners() {
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    deployerAddress = await accounts[0].getAddress();
    user = accounts[1];
    userAddress = await accounts[1].getAddress();
}

describe("Randomize tests", function () {
    let nomoPlayersDropMechanicMock: NomoPlayersDropMechanicMock;
    const testTokens: number[] = Array.from({ length: 10 }, (_, i) => i + 1);
    let indexFlags: any = {};

    function generateIndexFlags() {
        for (let i = 0; i < testTokens.length; i++) { indexFlags[i] = false; }
    }

    before(async function () {
        await setupSigners();
        const NomoPlayersDropMechanicMock_Factory: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanicMock");
        nomoPlayersDropMechanicMock = await NomoPlayersDropMechanicMock_Factory.deploy() as NomoPlayersDropMechanicMock;
        await nomoPlayersDropMechanicMock.connect(deployer).deployed();
        generateIndexFlags();
    });

    /**
     * The following test aims to prove that each index of the tokens passed array
     * has been chosen by the `randomize` function from `RandomGenerator` library
     * considering the decreasing size of the tokens array passed in the `buyTokensMock`
     * in `NomoPlayersDropMechanicMock` contract and respectively `buyTokens` in NomoPlayersDropMechanic contract.  
     * Hence, this test has to prove that the function hits each number at least one time,
     * by the probability theory it is calculated that the chance of getting the highest index
     * (which is the most rare since we decrease the array from the last index, in our case
     *  it is 9), is `1 / (n / 2)(firstNum + lastNum)` or equal to 1.8181%, which means we should 
     * have roughly 5.5 collections of 10 NFTs.
     * For the sake of the example, the test contains of 6 or 60 invocations of `buyTokensMock`.
     */
    it('should get each of 10 indexes in 60 iterations', async function () {

        let iteration: number | boolean = false;

        for (let i = 0; i < 6; i++) {
            const buyTokensTx = await nomoPlayersDropMechanicMock.buyTokensMock(testTokens);
            const txReceiptBuyTokens: ContractReceipt = await buyTokensTx.wait();
            const randomIndexes: string[] = getTokensFromEventArgs(txReceiptBuyTokens, "LogRandomIndexes");
            for (let k = 0; k < randomIndexes.length; k++) {
                if (!indexFlags[randomIndexes[k]]) indexFlags[randomIndexes[k]] = true;
            }
            if (Object.values(indexFlags).every((value) => value === true)) {
                iteration = i + 1;
                break;
            };
        }

        expect(iteration).to.not.equal(false);
    });
});