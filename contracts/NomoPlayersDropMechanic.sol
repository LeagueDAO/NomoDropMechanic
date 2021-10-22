// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./RandomGenerator.sol";

/**
 * @title Contract for distributing ERC721 tokens.
 * The purpose is to give the ability for users to buy with ERC20, randomly chosen tokens from the collection.
 */
contract NomoPlayersDropMechanic is ReentrancyGuard {
    using SafeMath for uint256;
    using RandomGenerator for RandomGenerator.Random;

    uint256[] public tokens;
    uint256 public tokenPrice;
    uint256 public maxQuantity;
    address public tokensVault;
    address payable public daoWalletAddr;
    address payable public strategyContractAddr;
    address public erc20Address;
    address public erc721Address;

    RandomGenerator.Random internal randomGenerator;

    event LogTokensBought(uint256[] _transferredTokens);

    /**
     * @notice Construct and initialize the contract.
     * @param  tokensArray array of all tokenIds minted in ERC721 contract instance
     * @param _tokenPrice to be used for the price
     * @param _maxQuantity to be used for the maximum quantity
     * @param _erc20Address address of the associated ERC20 contract instance
     * @param _erc721Address address of the associated ERC721 contract instance
     * @param _daoWalletAddr address of the DAO wallet
     * @param _strategyContractAddr address of the associated Strategy contract instance
     * @param _tokensVault address of the wallet used to store tokensArray
     */
    constructor(
        uint256[] memory tokensArray,
        uint256 _tokenPrice,
        uint256 _maxQuantity,
        address _erc20Address,
        address _erc721Address,
        address payable _daoWalletAddr,
        address payable _strategyContractAddr,
        address _tokensVault
    ) {
        require(
            tokensArray.length > 0,
            "Tokens array must include at least one item"
        );
        require(_tokenPrice > 0, "Token price must be higher than zero");
        require(_maxQuantity > 0, "Maximum quantity must be higher than zero");
        require(
            (_erc721Address != address(0)) &&
                (_daoWalletAddr != address(0)) &&
                (_strategyContractAddr != address(0)) &&
                (_erc20Address != address(0)),
            "Not valid address"
        );
        tokens = tokensArray;
        tokenPrice = _tokenPrice;
        maxQuantity = _maxQuantity;
        erc20Address = _erc20Address;
        erc721Address = _erc721Address;
        daoWalletAddr = _daoWalletAddr;
        strategyContractAddr = _strategyContractAddr;
        tokensVault = _tokensVault;
    }

    /**
     * @notice Distributes the requested quantity by the user and transfers the funds to DAO wallet address and Strategy contract.
     
     * @dev Buyer sends particular message value and requests quantity.
     * NomoPlayersDropMechanic distributes the tokens to the buyer's address if the requirements are met.
     * NomoPlayersDropMechanic is approved to have disposal of the collection minted on the tokensVault's address.
     * NomoPlayersDropMechanic transfers 20% of the ERC20 tokens to DAO wallet address and 80% to Strategy contract.
     *
     * @param quantity quantity of tokens which user requests to buy
     *
     * Requirements:
     * - the caller must have sufficient ERC20 tokens.
     */
    function buyTokens(uint256 quantity) external payable nonReentrant {
        require(
            (quantity > 0) && (quantity <= maxQuantity),
            "Invalid quantity"
        );
        require(tokens.length >= quantity, "Insufficient available quantity");

        uint256[] memory transferredTokens = new uint256[](quantity);
        uint256 fraction = quantity.mul(tokenPrice).div(5);

        for (uint256 i = 0; i < quantity; i++) {
            uint256 randomNumberIndex = randomGenerator.randomize(
                tokens.length
            );
            uint256 tokenId = tokens[randomNumberIndex];
            transferredTokens[i] = tokenId;
            tokens[randomNumberIndex] = tokens[tokens.length - 1];
            tokens.pop();

            IERC721(erc721Address).safeTransferFrom(
                tokensVault,
                msg.sender,
                tokenId
            );
        }

        IERC20(erc20Address).transferFrom(
            msg.sender, 
            daoWalletAddr,
            fraction
        );

        IERC20(erc20Address).transferFrom(
            msg.sender,
            strategyContractAddr,
            fraction.mul(4)
        );

        emit LogTokensBought(transferredTokens);
    }

    /**
     * @dev Returns the number of tokens left in the collection.
     * @return the length of the collection
     */
    function getTokensLeft() public view returns (uint256) {
        return tokens.length;
    }
}
