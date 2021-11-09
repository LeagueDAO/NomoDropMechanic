// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ERC721Mock is ERC721Enumerable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("ERC721Mock", "MOCK721") {}

    event LogCollectionMinted(uint256[] _mintedTokens);

    function mintCollection(uint256 quantity) public {
        require(quantity <= 40, "The requested quantity exceeds the limit.");

        uint256 newTokenId;
        uint256[] memory mintedTokens = new uint256[](quantity);

        for (uint256 i = 0; i < quantity; i++) {
            _tokenIds.increment();
            newTokenId = _tokenIds.current();
            _safeMint(msg.sender, newTokenId);
            mintedTokens[i] = newTokenId;
        }

        emit LogCollectionMinted(mintedTokens);
    }
}
