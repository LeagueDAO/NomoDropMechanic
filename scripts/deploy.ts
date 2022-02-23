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
  const [deployer, tokensVault] = await hre.ethers.getSigners();
  const tokensVaultAddress = tokensVault.address

  console.log('Deploying contracts with the account:', deployer.address);
  console.log('Tokens vault account:', tokensVault.address);
  console.log(`Deployer balance:  ${(await deployer.getBalance()).toString()}`);
  console.log(`TokensVault balance:  ${(await tokensVault.getBalance()).toString()} \n`);

  const rawPrice = coerceUndefined(process.env.TOKEN_PRICE);

  const erc20Address = coerceUndefined(process.env.DAI_ADDRESS);
  const price = ethers.utils.parseEther(rawPrice);
  const collectionLength = coerceUndefined(process.env.COLLECTION_LENGTH)
  const maxQuantity = coerceUndefined(process.env.MAX_QUANTITY);
  const erc721Address = coerceUndefined(process.env.ERC721_ADDRESS);
  const saleStart = coerceUndefined(process.env.SALE_START);
  const daoWalletAddress = coerceUndefined(process.env.DAO_WALLET_ADDRESS);
  const strategyContractAddress = coerceUndefined(process.env.STRATEGY_CONTRACT_ADDRESS);
  const vrfCoordinator = coerceUndefined(process.env.VRF_COORDINATOR);
  const linkToken = coerceUndefined(process.env.LINK_TOKEN);
  const keyhash = coerceUndefined(process.env.KEYHASH);
  const fee = coerceUndefined(process.env.FEE);
  const privileged = config.PRIVILEGED;

  const mintedTokens = config.generateCollection(collectionLength);
  //! shuffled so we do not know the actual order inside
  const shuffled = shuffle(mintedTokens)

  console.log('erc721Address: ', erc721Address);
  console.log('tokensVault: ', tokensVaultAddress);
  console.log('price: ', price.toString());
  console.log('maxQuantity: ', maxQuantity);
  console.log('vrfCoordinator: ', vrfCoordinator);
  console.log('linkToken: ', linkToken);
  console.log('keyhash: ', keyhash);
  console.log('fee: ', fee);

  const NomoPlayersDropMechanic_Factory: ContractFactory = await hre.ethers.getContractFactory("NomoPlayersDropMechanic");
  const nomoPlayersDropMechanicContract = await NomoPlayersDropMechanic_Factory.deploy(
    erc721Address,
    tokensVaultAddress,
    price,
    maxQuantity,
    vrfCoordinator,
    linkToken,
    keyhash,
    fee, { gasLimit: ethers.BigNumber.from(GAS_LIMIT) }) as NomoPlayersDropMechanic;

  console.log(`Deploying NomoPlayersDropMechanic at address: ${nomoPlayersDropMechanicContract.address} please wait...\n`);

  await nomoPlayersDropMechanicContract.deployed()

  console.log('Setting initial values...\n');

  const setErc20tx = await nomoPlayersDropMechanicContract.setERC20Address(erc20Address, { gasLimit: GAS_LIMIT });
  await setErc20tx.wait();
  console.log(`ERC20 contract has been set at address ${erc20Address}`);

  const setSaleStartTx = await nomoPlayersDropMechanicContract.setSaleStart(saleStart, { gasLimit: GAS_LIMIT });
  await setSaleStartTx.wait();
  console.log(`Sale start has been set at ${saleStart}`);

  const setDAOTx = await nomoPlayersDropMechanicContract.setDaoWalletAddress(daoWalletAddress, { gasLimit: GAS_LIMIT });
  await setDAOTx.wait()
  console.log(`DAO contract has been set at address ${daoWalletAddress}`);

  const setStrategyTx = await nomoPlayersDropMechanicContract.setStrategyContractAddress(strategyContractAddress, { gasLimit: GAS_LIMIT });
  await setStrategyTx.wait();
  console.log(`Strategy contract has been set at address ${strategyContractAddress}`);

  // Set tokens
  await addItemsToContract(shuffled, nomoPlayersDropMechanicContract.functions["addTokensToCollection"], "tokens", false);

  const setInitialTokensLengthTx = await nomoPlayersDropMechanicContract.setInitialTokensLength(collectionLength)
  await setInitialTokensLengthTx.wait();
  console.log(`Initial tokens length has been set to ${collectionLength}`);

  // Set privileged addresses
  await addItemsToContract(privileged, nomoPlayersDropMechanicContract.functions["setPrivileged"], "addresses", false);
  console.log(`Privileged addresses have been set!`);

  //! After deploy of the NomoPlayersDropMechanic contract, give approval for all tokens in the ERC721 contract to NomoPlayersDropMechanic contract
  // await ERC721.connect(tokensVault)setApprovalForAll(nomoPlayersDropMechanicContractAddress, true);

  fs.writeFileSync('./contracts.json', JSON.stringify({
    network: hre.network.name,
    nomoPlayersDropMechanic: nomoPlayersDropMechanicContract.address,
    erc721Address,
    erc20Address,
    saleStart,
    tokensVault: tokensVaultAddress,
    strategyContractAddress,
    daoWalletAddress,
    price: price.toString(),
    maxQuantity,
    vrfCoordinator,
    linkToken,
    keyhash,
    fee,
    collectionLength,
    mintedTokens: [...shuffled],
    privileged
  }, null, 2));

  console.log('Done!');
}

