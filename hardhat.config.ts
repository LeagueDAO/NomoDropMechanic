import { task, HardhatUserConfig } from 'hardhat/config';
import * as config from './config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import '@typechain/hardhat'
import 'hardhat-abi-exporter';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import 'hardhat-contract-sizer';
import "@appliedblockchain/chainlink-plugins-fund-link";

const lazyImport = async (module: any) => {
    return await import(module);
}

task("deploy-nftAirdropMechanic", "Deploys a NFTAirdropMechanic contract")
    .setAction(async taskArgs => {
        const { deployNFTAirdropMechanic } = await lazyImport('./scripts/deploy');
        await deployNFTAirdropMechanic();
    });
task("verify-nftAirdropMechanic", "Verify already deployed contract")
    .setAction(async () => {
        const { verifyNFTAirdropMechanic } = await lazyImport('./scripts/verify');
        await verifyNFTAirdropMechanic();
    })

task("airdrop-nftAirdropMechanic", "Airdrop ERC721 to eligible users")
    .setAction(async () => {
        const { executeAirdrop } = await lazyImport('./scripts/airdrop');
        await executeAirdrop();
    })

////////////////////
task("deploy-verify-ERC721", "Deploys and verifies ERC721 MOCK contract")
    .setAction(async () => {
        const { deployVerifyERC721 } = await lazyImport('./scripts/ERC721');
        await deployVerifyERC721();
    });
////////////////////

// Some of the settings should be defined in `./config.js`.
const cfg: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.8.9"
            },
            {
                version: "0.6.6"
            },
            {
                version: "0.4.24"
            }
        ]
    },
    defaultNetwork: 'hardhat',
    networks: config.networks,
    etherscan: config.etherscan,
    abiExporter: {
        only: ['NFTAirdropMechanic', 'RandomGenerator'],
        clear: true,
    },
    gasReporter: {
        enabled: (process.env.REPORT_GAS) ? true : false,
    },
    contractSizer: {
        alphaSort: true,
        runOnCompile: true,
        disambiguatePaths: false,
    },
};

export default cfg;