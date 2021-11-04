// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Contract which receives 80% of the transferred ERC20.
 */
contract StrategyMock {
    using SafeERC20 for IERC20;

    IERC20 want;

    /// @notice Event emitted when NFTs sale callback is executed in the vault
    event NftSale(uint256[] tokensIds, uint256[] prices);

    constructor() {}

    function setWantToken(IERC20 _want) external {
        want = _want;
    }

    /**
     * @notice Function that is called by sales contract as callback in order to deposit funds to strategy
     * @param tokensIds List of token IDs sold
     * @param prices Prices of sold tokens respectively (as wei)
     */
    function nftSaleCallback(uint256[] memory tokensIds, uint256[] memory prices) external {
        require(tokensIds.length == prices.length, "NomoVault: length mismatch");

        uint256 totalPrice;
        for (uint256 i = 0; i < tokensIds.length; i++) {
            totalPrice += prices[i];
        }

        want.safeTransferFrom(msg.sender, address(this), totalPrice);

        emit NftSale(tokensIds, prices);
    }
}
