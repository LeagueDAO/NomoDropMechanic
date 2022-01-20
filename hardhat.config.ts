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

task("deploy-nomoPlayersDropMechanic", "Deploys a NomoPlayersDropMechanic contract")
    .setAction(async taskArgs => {
        const { deployNomoPlayersDropMechanic } = await lazyImport('./scripts/deploy');
        await deployNomoPlayersDropMechanic();
    });

task("verify-nomoPlayersDropMechanic", "Verify already deployed contract")
    .setAction(async () => {
        const { verifyNomoPlayersDropMechanic } = await lazyImport('./scripts/verify');
        await verifyNomoPlayersDropMechanic();
    })

task("erc721-setApprovalForAll", "Request random value")
    .setAction(async () => {
        const { setApprovalForAll } = await lazyImport('./scripts/setApprovalForAll');
        await setApprovalForAll();
    })

task("airdrop-requestRandomValue", "Request random value")
    .setAction(async () => {
        const { requestRandomValue } = await lazyImport('./scripts/requestRandomValue');
        await requestRandomValue();
    })

task("airdrop-nomoPlayersDropMechanic", "Airdrop ERC721 to eligible users")
    .setAction(async () => {
        const { executeAirdrop } = await lazyImport('./scripts/airdrop');
        await executeAirdrop();
    })

task("deploy-verify-erc721", "Airdrop ERC721 to eligible users")
    .setAction(async () => {
        const { deployVerifyERC721 } = await lazyImport('./scripts/deployMockERC721');
        await deployVerifyERC721();
    })

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
        only: ['NomoPlayersDropMechanic', 'RandomGenerator'],
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