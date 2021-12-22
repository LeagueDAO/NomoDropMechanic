import hre, { ethers } from "hardhat";
import fs from 'fs';
import { NomoPlayersDropMechanic } from '../typechain';
import { ContractFactory } from 'ethers';
import { addItemsToContract } from '../test/helpers/helpers';
import config from './deployConfig/index';
import dotenv from 'dotenv';

const { coerceUndefined, shuffle } = config;
const GAS_LIMIT = '8000000'

dotenv.config();

export async function deployNomoPlayersDropMechanic() {
  await hre.run('compile');
  const [deployer] = await hre.ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);
  console.log(`Account balance:  ${(await deployer.getBalance()).toString()} \n`);

  const erc20Address = coerceUndefined(process.env.DAI_ADDRESS);
  const price = coerceUndefined(process.env.TOKEN_PRICE);
  const collectionLength = coerceUndefined(process.env.COLLECTION_LENGTH)
  const maxQuantity = coerceUndefined(process.env.MAX_QUANTITY);
  const erc721Address = coerceUndefined(process.env.ERC721_ADDRESS);
  const daoWalletAddress = coerceUndefined(process.env.DAO_WALLET_ADDRESS);
  const strategyContractAddress = coerceUndefined(process.env.STRATEGY_CONTRACT_ADDRESS);
  const tokensVault = coerceUndefined(process.env.TOKENS_VAULT);
  const presaleStartDate = coerceUndefined(process.env.PRESALE_START_DATE);
  const presaleDuration = coerceUndefined(process.env.PRESALE_DURATION);
  const vrfCoordinator = coerceUndefined(process.env.VRF_COORDINATOR);
  const linkToken = coerceUndefined(process.env.LINK_TOKEN);
  const keyhash = coerceUndefined(process.env.KEYHASH);
  const fee = coerceUndefined(process.env.FEE);
  const whitelisted = config.WHITE_LISTED;
  const privileged = config.PRIVILEGED;

  const mintedTokens = config.generateCollection(collectionLength);
  //! shuffled so we do not know the actual order inside
  const shuffled = shuffle(mintedTokens)

  // todo check collection length before deploy if === 90

  const NomoPlayersDropMechanic_Factory: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
  const nomoPlayersDropMechanicContract = await NomoPlayersDropMechanic_Factory.deploy(
    erc721Address,
    tokensVault,
    price,
    maxQuantity,
    vrfCoordinator,
    linkToken,
    keyhash,
    fee, { gasLimit: ethers.BigNumber.from(GAS_LIMIT) }) as NomoPlayersDropMechanic;

  console.log(`Deploying NomoPlayersDropMechanic at address: ${nomoPlayersDropMechanicContract.address} please wait...\n`);

  await nomoPlayersDropMechanicContract.deployed()

  console.log('Setting initial values...\n');

  // Set tokens
  await addItemsToContract(shuffled, nomoPlayersDropMechanicContract.functions["addTokensToCollection"], "tokens", false);

  const setInitialTokensLengthTx = await nomoPlayersDropMechanicContract.setInitialTokensLength(collectionLength)
  await setInitialTokensLengthTx.wait();
  console.log(`Initial tokens length has been set to ${collectionLength}`);

  // Set privileged addresses
  await addItemsToContract(privileged, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", false);
  console.log(`Privileged addresses have been set!`);

  //! After deploy of the NomoPlayersDropMechanic contract, give approval for all tokens in the ERC721 contract to NomoPlayersDropMechanic contract
  // await ERC721.setApprovalForAll(nomoPlayersDropMechanicContractAddress, true, { from: tokensVault });

  fs.writeFileSync('./contracts.json', JSON.stringify({
    network: hre.network.name,
    nomoPlayersDropMechanic: nomoPlayersDropMechanicContract.address,
    erc721Address,
    erc20Address,
    tokensVault,
    strategyContractAddress,
    daoWalletAddress,
    price,
    maxQuantity,
    vrfCoordinator,
    linkToken,
    keyhash,
    fee,
    collectionLength,
    presaleStartDate,
    presaleDuration,
    mintedTokens: [...shuffled],
    whitelisted,
    privileged
  }, null, 2));

  console.log('Done!');
}

