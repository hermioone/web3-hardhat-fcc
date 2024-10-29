// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

contract BasicNft is ERC721 {
    string public constant TOKEN_URI = 'ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json';
    uint256 private s_tokenCounter;

    event DogMinted(uint256 indexed tId);

    constructor() ERC721('Dogie', 'DOG') {
        s_tokenCounter = 0;
    }

    function mintNft() public {
        uint256 tokenId = s_tokenCounter;
        _safeMint(msg.sender, tokenId);
        emit DogMinted(tokenId);
        s_tokenCounter = tokenId + 1;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return TOKEN_URI;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
