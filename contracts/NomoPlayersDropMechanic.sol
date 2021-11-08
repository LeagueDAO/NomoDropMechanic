// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./RandomGenerator.sol";
import "./interfaces/INomoVault.sol";

/**
 * @title Contract for distributing ERC721 tokens.
 * The purpose is to give the ability for users to buy with ERC20, randomly chosen tokens from the collection.
 */
contract NomoPlayersDropMechanic is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using RandomGenerator for RandomGenerator.Random;
    using Address for address;

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
    mapping(address => bool) public whitelisted;
    mapping(uint256 => bool) public addedTokens;

    RandomGenerator.Random internal randomGenerator;

    event LogTokensBought(uint256[] _transferredTokens);
    event LogERC20AddressSet(address _erc20Address);
    event LogStrategyContractAddressSet(address _strategyContractAddress);
    event LogDaoWalletAddressSet(address _daoWalletAddress);
    event LogPresaleStartDateSet(uint256 _presaleStartDate);
    event LogPresaleDurationSet(uint256 _presaleDuration);
    event LogWhitelistedSet(address[] _whitelisted);
    event LogTokensAdded(uint256 length);

    modifier isValidAddress(address addr) {
        require(addr != address(0), "Not a valid address!");
        _;
    }

    /**
     * @notice Construct and initialize the contract.
     * @param _erc721Address address of the associated ERC721 contract instance
     * @param _tokensVault address of the wallet used to store tokensArray
     * @param _tokenPrice to be used for the price
     * @param _maxQuantity to be used for the maximum quantity
     */
    constructor(
        address _erc721Address,
        address _tokensVault,
        uint256 _tokenPrice,
        uint256 _maxQuantity
    ) isValidAddress(_erc721Address) isValidAddress(_tokensVault) {
        require(_tokenPrice > 0, "Token price must be higher than zero");
        require(_maxQuantity > 0, "Maximum quantity must be higher than zero");
        erc721Address = _erc721Address;
        tokensVault = _tokensVault;
        tokenPrice = _tokenPrice;
        maxQuantity = _maxQuantity;
    }

    function addTokensToCollection(uint256[] memory tokensArray)
        external
        onlyOwner
    {
        require(
            tokensArray.length > 0,
            "Tokens array must include at least one item"
        );

        for (uint256 i = 0; i < tokensArray.length; i++) {
            require(
                !addedTokens[tokensArray[i]],
                "Token has been already added"
            );
            addedTokens[tokensArray[i]] = true;
            tokens.push(tokensArray[i]);
        }

        emit LogTokensAdded(tokensArray.length);
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
    function setStrategyContractAddress(address _strategyContractAddress)
        public
        onlyOwner
        isValidAddress(_strategyContractAddress)
    {
        strategyContractAddress = _strategyContractAddress;
        emit LogStrategyContractAddressSet(strategyContractAddress);
    }

    /**
     * @notice Sets DAO wallet address.
     * @param _daoWalletAddress address of the DAO wallet
     */
    function setDaoWalletAddress(address _daoWalletAddress)
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
            "Presale: start must be in future!"
        );
        presaleStartDate = _presaleStartDate;
        emit LogPresaleStartDateSet(presaleStartDate);
    }

    /**
     * @notice Sets presaleDuration.
     * @param _presaleDuration uint256 representing the duration of the presale
     */
    function setPresaleDuration(uint256 _presaleDuration) public onlyOwner {
        require(_presaleDuration > 0, "Presale: not a valid duration!");
        presaleDuration = _presaleDuration;
        emit LogPresaleDurationSet(presaleDuration);
    }

    /**
     * @notice Sets whitelisted.
     * @param beneficiaries address[] representing the user who will be whitelisted
     */
    function setWhitelisted(address[] memory beneficiaries) public onlyOwner {
        require(
            beneficiaries.length > 0 && beneficiaries.length <= 100,
            "Beneficiaries array length must be in the bounds of 1 and 100"
        );

        for (uint256 i = 0; i < beneficiaries.length; i++) {
            whitelisted[beneficiaries[i]] = true;
        }

        emit LogWhitelistedSet(beneficiaries);
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
    function buyTokens(uint256 quantity) private nonReentrant {
        require(msg.sender == tx.origin, "Invalid caller!");
        require(
            (quantity > 0) && (quantity <= maxQuantity),
            "Invalid quantity"
        );
        require(tokens.length >= quantity, "Insufficient available quantity");

        uint256[] memory transferredTokens = new uint256[](quantity);
        uint256[] memory tokenPrices = new uint256[](quantity);
        uint256 fraction = quantity.mul(tokenPrice).div(5);
        uint256 strategyAmount = fraction.mul(4);
        for (uint256 i = 0; i < quantity; i++) {
            uint256 randomNumberIndex = randomGenerator.randomize(
                tokens.length
            );
            uint256 tokenId = tokens[randomNumberIndex];
            transferredTokens[i] = tokenId;
            tokens[randomNumberIndex] = tokens[tokens.length - 1];
            tokens.pop();

            tokenPrices[i] = strategyAmount.div(quantity);

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
            address(this),
            fraction.mul(4)
        );

        IERC20(erc20Address).approve(strategyContractAddress, strategyAmount);

        INomoVault(strategyContractAddress).nftSaleCallback(
            transferredTokens,
            tokenPrices
        );

        emit LogTokensBought(transferredTokens);
    }

    /**
     * @notice Invokes `buyTokens` if presale has started and msg.sender is whitelisted.
     *
     * Requirements:
     * - the caller must be whitelisted.
     * - the presale must have started.
     */
    function buyTokensOnPresale() public {
        require(
            (block.timestamp > presaleStartDate) &&
                (block.timestamp < (presaleStartDate + presaleDuration)),
            "Current timestamp is not in the bounds of the presale period"
        );
        require(whitelisted[msg.sender], "Claiming is forbidden");

        buyTokens(1);
        whitelisted[msg.sender] = false;
    }

    /**
     * @notice Invokes `buyTokens` with the quantity requested.
     */
    function buyTokensOnSale(uint256 quantity) public {
        require(
            block.timestamp > (presaleStartDate + presaleDuration),
            "Sale period not started!"
        );

        buyTokens(quantity);
    }

    /**
     * @dev Returns the number of tokens left in the collection.
     * @return the length of the collection
     */
    function getTokensLeft() public view returns (uint256) {
        return tokens.length;
    }
}
