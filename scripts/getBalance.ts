import hre, { ethers } from "hardhat";
import dotenv from 'dotenv';

dotenv.config();

export async function deployNFTAirdropMechanic() {
  await hre.run('compile');
  const [deployer] = await ethers.getSigners();
  console.log(`Account balance:  ${(await deployer.getBalance()).toString()} \n`);
  console.log('Done!');
}

