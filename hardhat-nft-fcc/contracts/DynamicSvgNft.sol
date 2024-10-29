// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import 'base64-sol/base64.sol';

contract DynamicSvgNft is ERC721 {
    uint256 private s_tokenCounter;
    string private i_lowImageURI;
    string private i_highImageURI;
    string private constant base64EncodedSvgPrefix = 'data:image/svg+xml;base64,';
    mapping(uint256=>uint256) public s_tokenIdToHiValue;

    constructor(string memory lowSvg, string memory highSvg) ERC721('Dynamic Svg NFT', 'DSN') {
        s_tokenCounter = 0;
        i_lowImageURI = svgToImageURI(lowSvg);
        i_highImageURI = svgToImageURI(highSvg);
    }

    /**
     * 
     * @param svg url of svg，比如：https://raw.githubusercontent.com/PatrickAlphaC/hardhat-nft-fcc/dd592fb4e8e222db70128fccbfeadd3a0a248bcd/images/dynamicNft/happy.svg
     */
    function svgToImageURI(string memory svg) public pure returns (string memory) {
        // string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(svg))));
        string memory svgBase64Encoded = Base64.encode(bytes(svg));
        return string(abi.encodePacked(base64EncodedSvgPrefix, svgBase64Encoded));
    }

    function mintNft() public {
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter += 1;
    }

    function _baseURI() internal pure override returns (string memory) {
        return 'data:application/json;base64,';
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory imageUri = i_lowImageURI;
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, blockhash(block.number-1))));
        if (random % 2 == 0) {
            imageUri = i_highImageURI;
        }

        return
            string(
                abi.encodePacked(
                    _baseURI(),
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                name(),
                                '", "description": "An NFT that changes based on the Chainlink Feed", ',
                                '"attributes": [{"trait_type": "coolness", "value": 100}], "images":"',
                                imageUri,
                                '"}'
                            )
                        )
                    )
                )
            );
    }

    function afterEncoded(string memory svg) public pure returns (string memory) {
        return string(abi.encodePacked(svg));
    }
}
