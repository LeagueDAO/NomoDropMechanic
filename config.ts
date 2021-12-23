import { NetworksUserConfig } from 'hardhat/types';
import { EtherscanConfig } from '@nomiclabs/hardhat-etherscan/dist/src/types';
import dotenv from 'dotenv';

dotenv.config();

export const networks: NetworksUserConfig = {
    // Needed for `solidity-coverage`
    coverage: {
        url: 'http://localhost:8545',
    },
    hardhat: {
    },
    // Mainnet
    mainnet: {
        url: `https://mainnet.infura.io/v3/${process.env.INFURA_ID}`,
        accounts: [`0x${process.env.PRIVATE_KEY}`]
    },
    rinkeby: {
        url: `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_ID}/eth/rinkeby`,
        accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    ropsten: {
        url: `https://speedy-nodes-nyc.moralis.io/${process.env.MORALIS_ID}/eth/rinkeby`,
        accounts: [`0x${process.env.PRIVATE_KEY}`],
    }
};

// Use to verify contracts on Etherscan
// https://buidler.dev/plugins/nomiclabs-buidler-etherscan.html
export const etherscan: EtherscanConfig = {
    apiKey: process.env.API_KEY,
};