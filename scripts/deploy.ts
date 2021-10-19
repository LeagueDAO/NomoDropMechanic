import hre from "hardhat";
import fs from 'fs';
import { NomoPlayersDropMechanic } from '../typechain';
import { ContractFactory } from 'ethers';

export async function deployNomoPlayersDropMechanic() {
  await hre.run('compile');
  const [deployer] = await hre.ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());

  // Example input data for constructor arguments, mandatory for the deploy
  // of the NomoPlayersDropMechanic contract
  const price: string = "250000000000000000";
  const maxQuantity: number = 20;
  const erc721Address: string = "0x380Fa2d97357e2bEf991c63CEC20a280b8CA6EE3";
  const daoWalletAddress: string = "0x380Fa2d97357e2bEf991c63CEC20a280b8CA6EE3";
  const strategyContractAddress: string = "0x380Fa2d97357e2bEf991c63CEC20a280b8CA6EE3";
  const tokensVault: string = "0x380Fa2d97357e2bEf991c63CEC20a280b8CA6EE3";
  const mintedTokens: number[] = Array.from({ length: 100 }, (_, i) => i + 1);

  const NomoPlayersDropMechanic_Factory: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
  const nomoPlayersDropMechanicContract = await NomoPlayersDropMechanic_Factory.deploy(
    mintedTokens,
    price,
    maxQuantity,
    erc721Address,
    daoWalletAddress,
    strategyContractAddress,
    tokensVault) as NomoPlayersDropMechanic;

  console.log('Deploying NomoPlayersDropMechanic, please wait...');

  await nomoPlayersDropMechanicContract.deployed();

  console.log('NomoPlayersDropMechanic contract:', nomoPlayersDropMechanicContract.address);

  fs.writeFileSync('./scripts/contracts.json', JSON.stringify({
    network: hre.network.name,
    nomoPlayersDropMechanic: nomoPlayersDropMechanicContract.address,
    mintedTokens,
    price,
    maxQuantity,
    erc721Address,
    daoWalletAddress,
    strategyContractAddress,
    tokensVault
  }, null, 2));

  // After deploy of the NomoPlayersDropMechanic contract, give approval for all tokens in the ERC721 contract to NomoPlayersDropMechanic contract
  // await ERC721.setApprovalForAll(nomoPlayersDropMechanicContractAddress, true, { from: deployer.address });

  console.log('Done!');
}

