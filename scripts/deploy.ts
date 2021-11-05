import hre, { ethers } from "hardhat";
import fs from 'fs';
import { NomoPlayersDropMechanic } from '../typechain';
import { ContractFactory } from 'ethers';
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
  const whitelisted = config.WHITE_LISTED;

  const mintedTokens = config.generateCollection(collectionLength);
  //! shuffled so we do not know the actual order inside
  const shuffled = shuffle(mintedTokens)

  const NomoPlayersDropMechanic_Factory: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
  const nomoPlayersDropMechanicContract = await NomoPlayersDropMechanic_Factory.deploy(
    erc721Address,
    tokensVault,
    price,
    maxQuantity, { gasLimit: ethers.BigNumber.from(GAS_LIMIT) }) as NomoPlayersDropMechanic;

  console.log(`Deploying NomoPlayersDropMechanic at address: ${nomoPlayersDropMechanicContract.address} please wait...\n`);

  await nomoPlayersDropMechanicContract.deployed()

  console.log('Setting initial values...\n');

  const setErc20tx = await nomoPlayersDropMechanicContract.setERC20Address(erc20Address, { gasLimit: GAS_LIMIT });
  await setErc20tx.wait();
  console.log(`ERC20 contract has been set at address ${erc20Address}`);

  const setDAOTx = await nomoPlayersDropMechanicContract.setDaoWalletAddress(daoWalletAddress, { gasLimit: GAS_LIMIT });
  await setDAOTx.wait()
  console.log(`DAO contract has been set at address ${daoWalletAddress}`);

  const setStrategyTx = await nomoPlayersDropMechanicContract.setStrategyContractAddress(strategyContractAddress, { gasLimit: GAS_LIMIT });
  await setStrategyTx.wait();
  console.log(`Strategy contract has been set at address ${strategyContractAddress}`);

  const setPresaleStartTx = await nomoPlayersDropMechanicContract.setPresaleStartDate(presaleStartDate);
  await setPresaleStartTx.wait()
  console.log(`Presale start date set on unix: ${presaleStartDate}`);

  const setPresaleDurationTx = await nomoPlayersDropMechanicContract.setPresaleDuration(presaleDuration);
  await setPresaleDurationTx.wait();
  console.log(`Presale duration has been set to ${presaleDuration} seconds`);

  const setWhitelistedTx = await nomoPlayersDropMechanicContract.setWhitelisted(whitelisted);
  await setWhitelistedTx.wait()
  console.log(`White listed addresses have been set!`);

  const tokensPerTx = 100;
  let txCounter = 0
  for (let i = 0; i < shuffled.length; i += tokensPerTx) {
    const slice = shuffled.slice(i, i + tokensPerTx);
    const addTokensTx = await nomoPlayersDropMechanicContract.addTokensToCollection(slice, { gasLimit: GAS_LIMIT });
    await addTokensTx.wait();
    console.log(`Add tokens tx: ${++txCounter} has been executed successfully`);
  }

  //! After deploy of the NomoPlayersDropMechanic contract, give approval for all tokens in the ERC721 contract to NomoPlayersDropMechanic contract
  // await ERC721.setApprovalForAll(nomoPlayersDropMechanicContractAddress, true, { from: tokensVault });

  fs.writeFileSync('./contracts.json', JSON.stringify({
    network: hre.network.name,
    nomoPlayersDropMechanic: '0xtest',
    erc721Address,
    erc20Address,
    tokensVault,
    strategyContractAddress,
    daoWalletAddress,
    price,
    maxQuantity,
    collectionLength,
    presaleStartDate,
    presaleDuration,
    mintedTokens: [...shuffled],
    whitelisted,

  }, null, 2));

  console.log('Done!');
}

