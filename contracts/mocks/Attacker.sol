// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.3;

import "../NomoPlayersDropMechanic.sol";

contract Attacker {
    constructor(address nomoPlayersDropMechanicAddr)  {
        NomoPlayersDropMechanic(nomoPlayersDropMechanicAddr).buyTokensOnSale(1);
    }
}
