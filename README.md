# LeagueDAO-NomoPlayersDropMechanic-contract

## Prerequisites
* ERC721 contact address which will be served
* Contract which will act as an Escrow where the funds will be stored
* This contract needs to be set as an operator in order to handle the transfer from the actual owner of the token to the `msg.sender`
* fill in your `.env` file as per the example provided in `env.example`

## Intro
This is a ERC721 compatible contract. It represents a contract, deployed on Polygon(MATIC) which accepts ERC20 tokens as a payment method and will take care for transferring ERC721 tokens to the `msg.sender`. NomoPlayersDropMechanic transfers 20% of the funds, in the form of ERC20 tokens, sent to DAO wallet address and 80% to Strategy contract. NomoPlayersDropMechanic contract possesses presale functionality, which gives the right to whitelisted users to purchase token in particular presale period of time, before the actual sale has started. The tokens array of ids passed into the constructor function in NomoPlayersDropMechanic contract, consists of `n` number of tokens, which are shuffled before the contract is deployed. The order of all token ids in the tokens array is intentionally hidden, in order the relation between `index` and `id` to be kept unclear in order to lower the change of malicious attack as much as possible.

In order the contract to be deployed properly, the contract will require:
* an array of the token id's, shuffled before the contract is deployed.
* erc721Address - address of the associated ERC721 contract instance.
* tokens vault - As this contract is not meant to be an owner at any given time, it'll need the original owner which the NomoPlayersDropMechanic contract will transfer the tokens from.
* token price - token price is intended to be paid from the user, in order to "buy" an NFT. The validation is something in top, but that's not the general purpose of the tokenPrice.
* maximum quantity - will be used for the maximum quantity of tokens which is possible to be bought per transaction.

In order the contract functions to operate, the contract will require:
* erc20 contract address to be set in `setERC20Address` - address of the associated ERC20 contract instance.
* `Strategy` contract address to be set in `setStrategyContractAddress` - address where 80% of the funds are going be to sent to.
* DAO wallet address to be set in `setDaoWalletAddress` - address where 20% of the funds are going be to sent to.

For more details refer to the white paper [white paper](https://medium.com/leaguedao/leaguedao-white-paper-a3dbf82050f7).

In order the contract presale functionality to operate properly, the contract will require:
* presaleStartDate to be set in `setPresaleStartDate` - uint256 representing the start date of the presale period.
* presaleDuration to be set in `setPresaleDuration` - uint256 representing the duration of the presale.
* whitelisted addresses to be set in `setWhitelisted` - address[] representing the users who will have the chance to redeem 1 token at most during the presale period.

## Install Dependencies
It's as simple as running 
```javascript
npm install
```
### Run
To deploy instances of the contracts for local development without prior knowledge to Hardhat, first copy .env.example to .env and run the following command:
```javascript
npm run deploy
```

This command starts up built-in Hardhat Network and migrates all contracts to the Hardhat Network instance.

If preferred by those who are familiar with Hardhat, the standard Hardhat commands can be used. Ganache can be started up manually by configuring a local network to be run against or using the `hardhat-ganache` plugin or you could start a Hardhat Network using `npx hardhat node`. For more information on how this can be achieved refer to the [official Hardhat documentation](https://hardhat.org/guides/ganache-tests.html#running-tests-with-ganache)

In a separate terminal, contracts can be deployed using
```javascript
  npx hardhat --network [customNetworkName] deploy
```

## Testing
The NomoPlayersDropMechanic contract is thoroughly unit tested using 
[Hardhat's testing framework](https://hardhat.org/tutorial/testing-contracts.html#_5-testing-contracts) 
support.
To run the unit tests:
```javascript
npx hardhat test
```
The unit tests encompass the happy path of transferring tokens as well as expected reverts.
By default, the build system automates starting and stopping 
[Hardhat Network](https://hardhat.org/hardhat-network/#hardhat-network) on port `http://localhost:8545` in
the background ready for each test run.

## Coverage 
We use [solidity-coverage](https://github.com/sc-forks/solidity-coverage) to 
provide test coverage reports. 
In order to have our contract fully tested and prepared for `Matic Mainnet` we made sure that our line of the contract is covered with a test and lays on 100% coverage. In order this to be verified run: 
```javascript
npx hardhat coverage
``` 

## Deployment
NomoPlayersDropMechanic.sol
* Deploys the NomoPlayersDropMechanic contract
* Initializes the contract with the provided:  
    - tokens: uint256[]
    - erc721Address: address
    - tokensVault: address
    - tokenPrice: uint256
    - maxQuantity: uint256

The default network this will be deployed on is `Mumbai Testnet`. Once the below command is run, the contract address will be stored in `./contracts.json`

```javascript
npm run contracts:migrate:dev
```

## Verify
The below command will take the contracts from `./contracts.json` and will try to verify them on the default network.
```javascript
npm run contracts:verify:dev
``` 

## License
This project is licensed under the [Apache License 2.0](./LICENCE) license.
