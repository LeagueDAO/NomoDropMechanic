import hre from "hardhat";
import fs from 'fs';
import { NomoPlayersDropMechanic } from '../typechain';
import { ContractFactory } from 'ethers';
import config from './deployConfig/index';
import dotenv from 'dotenv';

dotenv.config();

export async function deployNomoPlayersDropMechanic() {
  await hre.run('compile');
  const [deployer] = await hre.ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());

  // Example input data for constructor arguments and setter functions, mandatory for the deploy of the NomoPlayersDropMechanic contract
  let erc20Address;
  const price = process.env.TOKEN_PRICE;
  const maxQuantity = process.env.MAX_QUANTITY;
  const erc721Address = process.env.ERC721_ADDRESS;
  const daoWalletAddress = process.env.DAO_WALLET_ADDRESS;
  const strategyContractAddress = process.env.STRATEGY_CONTRACT_ADDRESS;
  const tokensVault = process.env.TOKENS_VAULT;

  const mintedTokens = config.MINTED_TOKENS();
  
  const whitelisted = config.WHITELISTED;

  if (hre.network.name === 'mumbai') {
    erc20Address = process.env.DAI_ADDRESS_MUMBAI;
  } else if (hre.network.name === 'mainnet') {
    erc20Address = process.env.DAI_ADDRESS_MATIC_MAINNET;
  }

  const NomoPlayersDropMechanic_Factory: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
  const nomoPlayersDropMechanicContract = await NomoPlayersDropMechanic_Factory.deploy(
    mintedTokens,
    erc721Address,
    tokensVault,
    price,
    maxQuantity) as NomoPlayersDropMechanic;

  console.log('Deploying NomoPlayersDropMechanic, please wait...');
  await nomoPlayersDropMechanicContract.deployed();

  console.log('NomoPlayersDropMechanic contract:', nomoPlayersDropMechanicContract.address);
  
  if (erc20Address) await nomoPlayersDropMechanicContract.setERC20Address(erc20Address);
  if (daoWalletAddress) await nomoPlayersDropMechanicContract.setDaoWalletAddress(daoWalletAddress);
  if (strategyContractAddress) await nomoPlayersDropMechanicContract.setStrategyContractAddress(strategyContractAddress);
  if (whitelisted) await nomoPlayersDropMechanicContract.setWhitelisted(whitelisted);

  fs.writeFileSync('./scripts/contracts.json', JSON.stringify({
    network: hre.network.name,
    nomoPlayersDropMechanic: nomoPlayersDropMechanicContract.address,
    mintedTokens,
    erc721Address,
    tokensVault,
    price,
    maxQuantity
  }, null, 2));

  // After deploy of the NomoPlayersDropMechanic contract, give approval for all tokens in the ERC721 contract to NomoPlayersDropMechanic contract
  // await ERC721.setApprovalForAll(nomoPlayersDropMechanicContractAddress, true, { from: tokensVault });

  console.log('Done!');
}

