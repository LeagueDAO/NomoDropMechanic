import hre from "hardhat";
import fs from 'fs';
import { NomoPlayersDropMechanic, ERC721Mock } from '../typechain';
import { ContractFactory, ContractReceipt } from 'ethers';
import config from './deployConfig/index';
import { getTokensFromEventArgs } from '../test/helpers/helpers';
import dotenv from 'dotenv';

const { coerceUndefined, shuffle } = config;

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
  // const erc721Address = coerceUndefined(process.env.ERC721_ADDRESS);
  const daoWalletAddress = coerceUndefined(process.env.DAO_WALLET_ADDRESS);
  const strategyContractAddress = coerceUndefined(process.env.STRATEGY_CONTRACT_ADDRESS);
  const tokensVault = coerceUndefined(process.env.TOKENS_VAULT);
  // const presaleStartDate = coerceUndefined(process.env.PRESALE_START_DATE);
  // const presaleDuration = coerceUndefined(process.env.PRESALE_DURATION);
  // const whitelisted = config.WHITE_LISTED;

  const ERC721Mock_Factory: ContractFactory = await hre.ethers.getContractFactory("ERC721Mock");
  const erc721Mock = await ERC721Mock_Factory.connect(deployer).deploy() as ERC721Mock;
  await erc721Mock.deployed();
  const erc721Address = erc721Mock.address;

  let mintedTokens: string[] = [];

  for (let i = 0; i < collectionLength; i += 40) {
    const mintCollectionTx = await erc721Mock.connect(deployer).mintCollection(40);
    const txReceiptCollectible: ContractReceipt = await mintCollectionTx.wait();
    mintedTokens = [...mintedTokens, ...getTokensFromEventArgs(txReceiptCollectible, "LogCollectionMinted")];
  }
  //! shuffled so we do not know the actual order inside
  let mintedTokensShuffled = shuffle(mintedTokens);
  

  const NomoPlayersDropMechanic_Factory: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
  const nomoPlayersDropMechanicContract = await NomoPlayersDropMechanic_Factory.deploy(
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

  // await nomoPlayersDropMechanicContract.setPresaleStartDate(presaleStartDate);
  // await nomoPlayersDropMechanicContract.setPresaleDuration(presaleDuration);
  // await nomoPlayersDropMechanicContract.setWhitelisted(whitelisted);

  for (let i = 0; i < mintedTokensShuffled.length; i += 100) {
    const slice = mintedTokensShuffled.slice(i, i + 100);
    await nomoPlayersDropMechanicContract.addTokensToCollection(slice, { gasLimit: "8000000" });
  }

  // After deploy of the NomoPlayersDropMechanic contract, give approval for all tokens in the ERC721 contract to NomoPlayersDropMechanic contract
  // await ERC721.setApprovalForAll(nomoPlayersDropMechanicContractAddress, true, { from: tokensVault });

  fs.writeFileSync('./contracts.json', JSON.stringify({
    network: hre.network.name,
    nomoPlayersDropMechanic: nomoPlayersDropMechanicContract.address,
    mintedTokens: [...mintedTokensShuffled],
    erc721Address,
    tokensVault,
    price,
    maxQuantity
  }, null, 2));

  console.log('Done!');
}

