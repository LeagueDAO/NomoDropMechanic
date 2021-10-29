import hre from "hardhat";
import fs from 'fs';
import { NomoPlayersDropMechanic } from '../typechain';
import { ContractFactory } from 'ethers';
import config from './deployConfig/index';
import dotenv from 'dotenv';

const {coerceUndefined, shuffle} = config;

dotenv.config();

export async function deployNomoPlayersDropMechanic() {
  await hre.run('compile');
  const [deployer] = await hre.ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());
  
  // Example input data for constructor arguments and setter functions, mandatory for the deploy of the NomoPlayersDropMechanic contract
  const erc20Address: string = coerceUndefined(process.env.DAI_ADDRESS);
  const price = coerceUndefined(process.env.TOKEN_PRICE);
  const collectionLength = coerceUndefined(process.env.COLLECTION_LENGTH)
  const maxQuantity = coerceUndefined(process.env.MAX_QUANTITY);
  const erc721Address = coerceUndefined(process.env.ERC721_ADDRESS);
  const daoWalletAddress = coerceUndefined(process.env.DAO_WALLET_ADDRESS);
  const strategyContractAddress = coerceUndefined(process.env.STRATEGY_CONTRACT_ADDRESS);
  const tokensVault = coerceUndefined(process.env.TOKENS_VAULT);

  const mintedTokens = config.generateCollection(collectionLength);
  //! shuffled so we do not know the actual order inside
  const shuffled = shuffle(mintedTokens)
  const whitelisted = config.WHITE_LISTED;
  
  const NomoPlayersDropMechanic_Factory: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
  const nomoPlayersDropMechanicContract = await NomoPlayersDropMechanic_Factory.deploy(
    shuffled,
    erc721Address,
    tokensVault,
    price,
    maxQuantity) as NomoPlayersDropMechanic;

  console.log('Deploying NomoPlayersDropMechanic, please wait...');
  await nomoPlayersDropMechanicContract.deployed();

  console.log('NomoPlayersDropMechanic contract:', nomoPlayersDropMechanicContract.address);
  
  await nomoPlayersDropMechanicContract.setERC20Address(erc20Address);
  await nomoPlayersDropMechanicContract.setDaoWalletAddress(daoWalletAddress);
  await nomoPlayersDropMechanicContract.setStrategyContractAddress(strategyContractAddress);
  await nomoPlayersDropMechanicContract.setWhitelisted(whitelisted);

  fs.writeFileSync('./scripts/contracts.json', JSON.stringify({
    network: hre.network.name,
    nomoPlayersDropMechanic: nomoPlayersDropMechanicContract.address,
    mintedTokens:[...shuffled],
    erc721Address,
    tokensVault,
    price,
    maxQuantity
  }, null, 2));

  // After deploy of the NomoPlayersDropMechanic contract, give approval for all tokens in the ERC721 contract to NomoPlayersDropMechanic contract
  // await ERC721.setApprovalForAll(nomoPlayersDropMechanicContractAddress, true, { from: tokensVault });

  console.log('Done!');
}

