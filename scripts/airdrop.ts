import hre, { ethers } from "hardhat";
import fs from 'fs';

const GAS_LIMIT = '8000000'

export async function executeAirdrop() {
  const [deployer] = await hre.ethers.getSigners();

  console.log('Executing airdrop with the account:', deployer.address);
  console.log(`Account balance:  ${(await deployer.getBalance()).toString()} \n`);

  const contracts = JSON.parse(
    fs.readFileSync(`./contracts.json`, 'utf-8')
  );

  const nomoPlayersDropMechanicFactory = await ethers.getContractFactory("NomoPlayersDropMechanic");
  const nomoPlayersDropMechanic = await nomoPlayersDropMechanicFactory.attach(contracts.nomoPlayersDropMechanic);

  console.log(`Air-dropping ERC721 to eligible users...`);

  try {
    const airdropTx = await nomoPlayersDropMechanic.executeAirdrop({ gasLimit: ethers.BigNumber.from(GAS_LIMIT) });
    airdropTx.wait();
  } catch (error) {
    logError('NomoPlayersDropMechanic Airdrop', error.message);
  }

  console.log("Airdrop was executed successfully!\n")
  console.log(`Account balance after airdrop:  ${(await deployer.getBalance()).toString()} \n`);
}

function logError(contractName: string, msg: string) {
  console.log(
    `\x1b[31mError while trying to verify contract: ${contractName}!`
  );
  console.log(`Error message: ${msg}`);
  resetConsoleColor();
}

function resetConsoleColor() {
  console.log('\x1b[0m');
}
