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
    rinkeby: {
        url: `https://rinkeby.infura.io/v3/${process.env.INFURA_ID}`,
        accounts: [`0x${process.env.PRIVATE_KEY}`]
    },
    // Mumbai Testnet
    mumbai: {
        url: "https://rpc-mumbai.maticvigil.com",
        chainId: 80001,
        accounts: [`0x${process.env.PRIVATE_KEY}`],
        gas: 'auto',
        gasPrice: 'auto',
        gasMultiplier: 1.5,
    },
    // Matic Mainnet
    mainnet: {
        url: "https://rpc-mainnet.matic.network",
        chainId: 137,
        accounts: [`0x${process.env.PRIVATE_KEY}`],
        gas: 'auto',
        gasPrice: 'auto',
        gasMultiplier: 1.5,
    },
};

// Use to verify contracts on Etherscan
// https://buidler.dev/plugins/nomiclabs-buidler-etherscan.html
export const etherscan: EtherscanConfig = {
    apiKey: process.env.API_KEY,
};