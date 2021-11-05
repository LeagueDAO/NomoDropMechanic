interface INomoVault {
    function nftSaleCallback(
        uint256[] memory tokensIds,
        uint256[] memory prices
    ) external;
}