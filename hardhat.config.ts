import { task, HardhatUserConfig } from 'hardhat/config';
import * as config from './config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import '@typechain/hardhat'
import 'hardhat-abi-exporter';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import 'hardhat-contract-sizer';

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

task("airdrop-nomoPlayersDropMechanic", "Airdrop ERC721 to privileged users")
    .setAction(async () => {
        const { executeAirdrop } = await lazyImport('./scripts/airdrop');
        await executeAirdrop();
    })
// Some of the settings should be defined in `./config.js`.
const cfg: HardhatUserConfig = {
    solidity: {
        version: '0.8.9',
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
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