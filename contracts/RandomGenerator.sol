// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

library RandomGenerator {
    struct Random {
        uint256 random;
    }

    /**
     * @dev Returns the randomly chosen index.
     * @param max current length of the collection.
     * @return length of the collection
     */
    function randomize(Random storage randomIndex, uint256 max)
        internal
        returns (uint256)
    {
        randomIndex.random =
            uint256(
                keccak256(
                    abi.encode(
                        keccak256(
                            abi.encodePacked(
                                msg.sender,
                                tx.origin,
                                gasleft(),
                                block.timestamp,
                                block.difficulty,
                                block.number,
                                blockhash(block.number)
                            )
                        )
                    )
                )
            ) % max;

        return randomIndex.random;
    }
}
