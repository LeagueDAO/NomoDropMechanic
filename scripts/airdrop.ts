import { ethers } from "hardhat";
import fs from 'fs';

export async function executeAirdrop() {
  const contracts = JSON.parse(
    fs.readFileSync(`./contracts.json`, 'utf-8')
  );

  const nomoPlayersDropMechanicFactory = await ethers.getContractFactory("NomoPlayersDropMechanic");
  const nomoPlayersDropMechanic = await nomoPlayersDropMechanicFactory.attach(contracts.nomoPlayersDropMechanic);

  console.log(`Air-dropping ERC721 to privileged users...`);
  await nomoPlayersDropMechanic.executeAirdrop();
}




