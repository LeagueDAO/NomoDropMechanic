// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.9;

import "../RandomGenerator.sol";

contract NomoPlayersDropMechanicMock {
    using RandomGenerator for RandomGenerator.Random;

    RandomGenerator.Random internal randomGenerator;

    event LogRandomIndexes(uint256[] _randomIndexes);

    function buyTokensMock(uint256[] memory testTokens) public {
        uint256[] memory randomIndexes = new uint256[](testTokens.length);
        uint256 quantity = testTokens.length;

        for (uint256 i = 0; i < quantity; i++) {
            uint256 randomNumberIndex = randomGenerator.randomize(testTokens.length);
            randomIndexes[i] = randomNumberIndex;
            testTokens[randomNumberIndex] = testTokens[testTokens.length - 1];
            delete testTokens[testTokens.length - 1];
        }

        emit LogRandomIndexes(randomIndexes);
    }
}
