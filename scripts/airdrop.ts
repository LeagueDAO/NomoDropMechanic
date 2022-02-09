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

  const nomoPlayersDropMechanic_Factory = await ethers.getContractFactory("NomoPlayersDropMechanic");
  const nomoPlayersDropMechanic = await nomoPlayersDropMechanic_Factory.attach(contracts.nomoPlayersDropMechanic);

  console.log(`Air-dropping ERC721 to privileged users...`);

  try {
    const airdropTx = await nomoPlayersDropMechanic.executeAirdrop({ gasLimit: ethers.BigNumber.from(GAS_LIMIT) });
    await airdropTx.wait();
  } catch (error) {
    console.log(error)
  }

  console.log("Airdrop was executed successfully!\n")
  console.log(`Account balance after airdrop:  ${(await deployer.getBalance()).toString()} \n`);
}