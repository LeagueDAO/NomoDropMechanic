// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
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
contract NomoPlayersDropMechanic is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using RandomGenerator for RandomGenerator.Random;

    uint256[] private tokens;
    uint256 public tokenPrice;
    uint256 public maxQuantity;
    address public tokensVault;
    address public daoWalletAddress;
    address public strategyContractAddress;
    address public erc20Address;
    address public erc721Address;
    uint256 public presaleStartDate;
    uint256 public presaleDuration;

    RandomGenerator.Random internal randomGenerator;

    event LogTokensBought(uint256[] _transferredTokens);
    event LogERC20AddressSet(address _erc20Address);
    event LogStrategyContractAddressSet(address _strategyContractAddress);
    event LogDaoWalletAddressSet(address _daoWalletAddress);
    event LogPresaleStartDateSet(uint256 _presaleStartDate);
    event LogPresaleDurationSet(uint256 _presaleDuration);

    modifier isValidAddress(address addr) {
        require(addr != address(0), "Not a valid address!");
        _;
    }

    /**
     * @notice Construct and initialize the contract.
     * @param  tokensArray array of all tokenIds minted in ERC721 contract instance
     * @param _erc721Address address of the associated ERC721 contract instance
     * @param _tokensVault address of the wallet used to store tokensArray
     * @param _tokenPrice to be used for the price
     * @param _maxQuantity to be used for the maximum quantity
     */
    constructor(
        uint256[] memory tokensArray,
        address _erc721Address,
        address _tokensVault,
        uint256 _tokenPrice,
        uint256 _maxQuantity
    ) isValidAddress(_erc721Address) isValidAddress(_tokensVault) {
        require(
            tokensArray.length > 0,
            "Tokens array must include at least one item"
        );
        require(_tokenPrice > 0, "Token price must be higher than zero");
        require(_maxQuantity > 0, "Maximum quantity must be higher than zero");
        tokens = tokensArray;
        erc721Address = _erc721Address;
        tokensVault = _tokensVault;
        tokenPrice = _tokenPrice;
        maxQuantity = _maxQuantity;
    }

    /**
     * @notice Sets ERC20 address.
     * @param _erc20Address address of the associated ERC20 contract instance
     */
    function setERC20Address(address _erc20Address)
        public
        onlyOwner
        isValidAddress(_erc20Address)
    {
        erc20Address = _erc20Address;
        emit LogERC20AddressSet(erc20Address);
    }

    /**
     * @notice Sets `Strategy` contract address associated with `Strategy` contract instance.
     * @param _strategyContractAddress address of the associated `Strategy` contract instance
     */
    function setStrategyContractAddress(
        address payable _strategyContractAddress
    ) public onlyOwner isValidAddress(_strategyContractAddress) {
        strategyContractAddress = _strategyContractAddress;
        emit LogStrategyContractAddressSet(strategyContractAddress);
    }

    /**
     * @notice Sets DAO wallet address.
     * @param _daoWalletAddress address of the DAO wallet
     */
    function setDaoWalletAddress(address payable _daoWalletAddress)
        public
        onlyOwner
        isValidAddress(_daoWalletAddress)
    {
        daoWalletAddress = _daoWalletAddress;
        emit LogDaoWalletAddressSet(daoWalletAddress);
    }

    /**
     * @notice Sets presaleStartDate.
     * @param _presaleStartDate uint256 representing the start date of the presale
     */
    function setPresaleStartDate(uint256 _presaleStartDate) public onlyOwner {
        require(
            _presaleStartDate > block.timestamp,
            "Presale start date can't be in the past"
        );
        presaleStartDate = _presaleStartDate;
        emit LogPresaleStartDateSet(presaleStartDate);
    }

    /**
     * @notice Sets presaleDuration.
     * @param _presaleDuration uint256 representing the duration of the presale
     */
    function setPresaleDuration(uint256 _presaleDuration) public onlyOwner {
        require(
            _presaleDuration > 0,
            "Presale duration must be higher than zero"
        );
        presaleDuration = _presaleDuration;
        emit LogPresaleDurationSet(presaleDuration);
    }

    // TODO implement setWhitelisted() in next iteration of the presale functionality

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
            daoWalletAddress,
            fraction
        );

        IERC20(erc20Address).transferFrom(
            msg.sender,
            strategyContractAddress,
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
