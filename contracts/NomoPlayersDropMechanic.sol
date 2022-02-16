// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./RandomNumberConsumer.sol";
import "./interfaces/INomoVault.sol";

/**
 * @title Contract for distributing ERC721 tokens.
 * The purpose is to give the ability for users to buy with ERC20, randomly chosen tokens from the collection.
 */
contract NomoPlayersDropMechanic is
    Ownable,
    ReentrancyGuard,
    RandomNumberConsumer
{
    using SafeMath for uint256;
    using Address for address;

    uint256[] private tokens;
    address[] public privileged;
    bool public isAirdropExecuted;
    uint256 public initialTokensLength;
    uint256 public tokenPrice;
    uint256 public maxQuantity;
    address public tokensVault;
    address public daoWalletAddress;
    address public strategyContractAddress;
    address public erc20Address;
    address public erc721Address;
    bytes32 public lastRequestId;
    mapping(uint256 => bool) public addedTokens;
    mapping(address => uint256) private addressToRandomNumber;

    event LogTokensBought(uint256[] _transferredTokens);
    event LogTokensAirdropped(uint256[] _airdroppedTokens);
    event LogERC20AddressSet(address _erc20Address);
    event LogStrategyContractAddressSet(address _strategyContractAddress);
    event LogDaoWalletAddressSet(address _daoWalletAddress);
    event LogInitialTokensLengthSet(uint256 _initialTokensLength);
    event LogPrivilegedSet(address[] _privileged);
    event LogTokensAdded(uint256 length);
    event LogRandomNumberRequested(address from);
    event LogRandomNumberSaved(address from);

    modifier isValidAddress(address addr) {
        require(addr != address(0), "Not a valid address!");
        _;
    }

    modifier isValidRandomNumber() {
        require(
            addressToRandomNumber[msg.sender] != 0,
            "Invalid random number"
        );
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
        uint256 _maxQuantity,
        address _vrfCoordinator,
        address _LINKToken,
        bytes32 _keyHash,
        uint256 _fee
    )
        RandomNumberConsumer(_vrfCoordinator, _LINKToken, _keyHash, _fee)
        isValidAddress(_erc721Address)
        isValidAddress(_tokensVault)
    {
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
     * @notice Sets initialTokensLength.
     * @param _initialTokensLength uint256 representing the initial length of the tokens
     */
    function setInitialTokensLength(uint256 _initialTokensLength)
        public
        onlyOwner
    {
        require(_initialTokensLength > 0, "must be above 0!");
        initialTokensLength = _initialTokensLength;
        emit LogInitialTokensLengthSet(initialTokensLength);
    }

    /**
     * @notice Sets privileged members who can claim free token.
     * @param members address[] representing the members will be privileged
     */
    function setPrivileged(address[] memory members) public onlyOwner {
        require(
            members.length > 0 && members.length <= 100,
            "Privileged members array length must be in the bounds of 1 and 100"
        );

        for (uint256 i = 0; i < members.length; i++) {
            privileged.push(members[i]);
        }

        emit LogPrivilegedSet(members);
    }

    /**
     * @notice Requests random number from Chainlink VRF.
     */
    function getRandomValue() public {
        require(
            addressToRandomNumber[msg.sender] == 0,
            "Random number already received"
        );

        lastRequestId = getRandomNumber();

        emit LogRandomNumberRequested(msg.sender);
    }

    /**
     * @notice Check if random number from Chainlink VRF is received for `address`.
     * @param _address address for which RN is checked.
     */
    function canBuy(address _address) external view returns (bool) {
        return addressToRandomNumber[_address] > 0;
    }

    /**
     *  @notice This is a callback method which is getting called in RandomConsumerNumber.sol
     */
    function saveRandomNumber(address from, uint256 n) internal override {
        addressToRandomNumber[from] = n;

        emit LogRandomNumberSaved(from);
    }

    /**
     * @notice Transfers ERC721 token to `n` number of privileged users.
     
     * @dev Deployer executes airdrop.
     * NomoPlayersDropMechanic distributes one token to each of the privileged addresses if the requirements are met.
     *
     * Requirements:
     * - the caller must be owner.
     */
    function executeAirdrop() public onlyOwner isValidRandomNumber {
        require(!isAirdropExecuted, "Airdrop has been executed");
        require(
            (tokens.length >= privileged.length) && (privileged.length > 0),
            "Invalid airdrop parameters"
        );

        uint256[] memory randomNumbers = expand(
            addressToRandomNumber[msg.sender],
            privileged.length
        );
        uint256[] memory airdroppedTokens = new uint256[](privileged.length);

        isAirdropExecuted = true;

        addressToRandomNumber[msg.sender] = 0;

        for (uint256 i = 0; i < privileged.length; i++) {
            uint256 randomNumber = randomNumbers[i] % tokens.length;
            uint256 tokenId = tokens[randomNumber];
            airdroppedTokens[i] = tokenId;
            tokens[randomNumber] = tokens[tokens.length - 1];
            tokens.pop();

            IERC721(erc721Address).safeTransferFrom(
                tokensVault,
                privileged[i],
                tokenId
            );
        }

        emit LogTokensAirdropped(airdroppedTokens);
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
    function buyTokensOnSale(uint256 quantity)
        public
        nonReentrant
        isValidRandomNumber
    {
        require(isAirdropExecuted, "Airdrop has not been executed!");
        require(
            (quantity > 0) && (quantity <= maxQuantity),
            "Invalid quantity"
        );
        require(tokens.length >= quantity, "Insufficient available quantity");

        uint256[] memory randomNumbers = expand(
            addressToRandomNumber[msg.sender],
            quantity
        );
        uint256[] memory transferredTokens = new uint256[](quantity);
        uint256[] memory tokenPrices = new uint256[](quantity);
        uint256 fraction = quantity.mul(tokenPrice).div(5);
        uint256 strategyAmount = fraction.mul(4);

        addressToRandomNumber[msg.sender] = 0;

        for (uint256 i = 0; i < quantity; i++) {
            uint256 randomIndex = randomNumbers[i] % tokens.length;
            uint256 tokenId = tokens[randomIndex];
            transferredTokens[i] = tokenId;
            tokens[randomIndex] = tokens[tokens.length - 1];
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
     * @dev Returns the number of tokens left in the collection.
     * @return the length of the collection
     */
    function getTokensLeft() public view returns (uint256) {
        return tokens.length;
    }
}
