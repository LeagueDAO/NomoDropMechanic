import hre, { ethers } from "hardhat";
import fs from 'fs';
import { NFTAirdropMechanic } from '../typechain';
import { ContractFactory } from 'ethers';
import { addItemsToContract } from '../test/helpers/helpers';
import config from './deployConfig/index';
import dotenv from 'dotenv';

const { coerceUndefined, shuffle } = config;
const GAS_LIMIT = '8000000'

dotenv.config();

export async function deployNFTAirdropMechanic() {
  await hre.run('compile');
  const [deployer] = await hre.ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);
  console.log(`Account balance:  ${(await deployer.getBalance()).toString()} \n`);

  const price = coerceUndefined(process.env.TOKEN_PRICE);
  const collectionLength = coerceUndefined(process.env.COLLECTION_LENGTH)
  const maxQuantity = coerceUndefined(process.env.MAX_QUANTITY);
  const erc721Address = coerceUndefined(process.env.ERC721_ADDRESS);
  const tokensVault = coerceUndefined(process.env.TOKENS_VAULT);
  const vrfCoordinator = coerceUndefined(process.env.VRF_COORDINATOR);
  const linkToken = coerceUndefined(process.env.LINK_TOKEN);
  const keyhash = coerceUndefined(process.env.KEYHASH);
  const fee = coerceUndefined(process.env.FEE);
  const expectedEligibleCount = coerceUndefined(process.env.ELIGIBLE_COUNT);
  const whitelisted = config.WHITE_LISTED;
  const eligible = config.ELIGIBLE;
  const tokenIds = config.TOKEN_IDS;

  if (eligible.length != expectedEligibleCount) {
    console.log(`Eligible count isn't ${expectedEligibleCount}!`);
    return;
  }

  if (tokenIds.length != collectionLength) {
    console.log(`Tokens count isn't ${collectionLength}!`);
    return;
  }

  const NFTAirdropMechanic_Factory: ContractFactory = await hre.ethers.getContractFactory("NFTAirdropMechanic");
  const nftAirdropMechanicContract = await NFTAirdropMechanic_Factory.deploy(
    erc721Address,
    tokensVault,
    price,
    maxQuantity,
    vrfCoordinator,
    linkToken,
    keyhash,
    fee, { gasLimit: ethers.BigNumber.from(GAS_LIMIT) }) as NFTAirdropMechanic;

  console.log(`Deploying NFTAirdropMechanic at address: ${nftAirdropMechanicContract.address} please wait...\n`);

  await nftAirdropMechanicContract.deployed()

  console.log('Setting initial values...\n');

  // Set tokens
  await addItemsToContract(tokenIds, nftAirdropMechanicContract.functions["addTokensToCollection"], "tokens", false);

  const setInitialTokensLengthTx = await nftAirdropMechanicContract.setInitialTokensLength(collectionLength)
  await setInitialTokensLengthTx.wait();
  console.log(`Initial tokens length has been set to ${collectionLength}`);

  // Set eligible addresses
  await addItemsToContract(eligible, nftAirdropMechanicContract.functions["setEligible"], "addresses", false);
  console.log(`Eligible addresses have been set!`);

  //! After deploy of the NFTAirdropMechanic contract, give approval for all tokens in the ERC721 contract to NFTAirdropMechanic contract
  // await ERC721.setApprovalForAll(nftAirdropMechanicContract.address, true, { from: tokensVault });

  fs.writeFileSync('./contracts.json', JSON.stringify({
    network: hre.network.name,
    nftAirdropMechanic: nftAirdropMechanicContract.address,
    erc721Address,
    tokensVault,
    price,
    maxQuantity,
    vrfCoordinator,
    linkToken,
    keyhash,
    fee,
    collectionLength,
    mintedTokens: [...tokenIds],
    whitelisted,
    eligible
  }, null, 2));

  console.log('Done!');
}

