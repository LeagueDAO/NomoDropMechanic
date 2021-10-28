// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.3;

import "../NomoPlayersDropMechanic.sol";

/**
 * @title Contract for testing vulnerability, which could be an object of attack.
 */
contract Attacker {
    constructor(address nomoPlayersDropMechanicAddr)  {
        NomoPlayersDropMechanic(nomoPlayersDropMechanicAddr).buyTokensOnSale(1);
    }
}
