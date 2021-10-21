// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DAIMock is ERC20 {
    constructor(uint256 mintQty) ERC20("DAIMock", "DMOCK") {
        _mint(msg.sender, mintQty * 10 ** 18);
    }
}
