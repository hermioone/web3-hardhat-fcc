// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

error NftMarketplace_PriceMustBeAboveZero();
error NftMarketplace_NotApprovedForMarketplace();
error NftMarketplace_AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace_NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace_PriceNotMet(address nftAddress, uint256 tokenId, uint256 expectedPrice, uint256 actualPrice);
error NftMarketplace_NotOwner();
error NftMarketplace_NoProceeds();
error NftMarketplace_TransferFailed();


contract NftMarketplace is ReentrancyGuard {
    struct Listing {
        uint256 price;
        address seller;
    }

    event ItemListed(address indexed seller, address indexed nftAddress, uint256 indexed tokenId, uint256 price);
    event ItemBought(address indexed buyer, address indexed nftAddress, uint256 indexed tokenId, uint256 price);
    event ItemCanceled(address indexed seller, address indexed nftAddress, uint256 indexed tokenId);

    mapping(address => mapping(uint256 => Listing)) private s_listings;
    /**
     * seller 通过卖 nft 挣的钱
     */
    mapping(address => uint256) private s_proceeds;

    constructor() {}

    // NFT 的 owner 授权 marketplace 展示这个 nft
    function listItem(address nftAddress, uint256 tokenId, uint256 price) external isOwner(nftAddress, tokenId, msg.sender) {
        if (price <= 0) {
            revert NftMarketplace_PriceMustBeAboveZero();
        }
        if (s_listings[nftAddress][tokenId].price > 0) {
            revert NftMarketplace_AlreadyListed(nftAddress, tokenId);
        }
        // Owner 仍然可以持有他们的 NFT，但是给于 marketplace 授权去卖这些 NFT
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace_NotApprovedForMarketplace();
        }
        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    /**
     * 购买 nft
     * @param nftAddress    nft 地址
     * @param tokenId       nft 的 tokenId
     * nonReentrant 防止重入攻击
     */
    function buyItem(address nftAddress, uint256 tokenId) external payable isListed(nftAddress, tokenId) nonReentrant {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (msg.value < listing.price) {
            revert NftMarketplace_PriceNotMet(nftAddress, tokenId, listing.price, msg.value);
        }
        s_proceeds[listing.seller] = s_proceeds[listing.seller] + msg.value;
        delete (s_listings[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(listing.seller, msg.sender, tokenId);
        emit ItemBought(msg.sender, nftAddress, tokenId, listing.price);
    }

    /**
     * Nft 的 seller 取消挂牌 nft
     * @param nftAddress    nft 的 address
     * @param tokenId       nft 的 tokenId
     */
    function cancelListing(address nftAddress, uint256 tokenId) external isOwner(nftAddress, tokenId, msg.sender) isListed(nftAddress, tokenId) {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }

    /**
     * Nft 的 seller 更新售价
     * @param nftAddress    nft 的 address
     * @param tokenId       nft 的 tokenId
     * @param newPrice      nft 的新售价
     */
    function updateListing(address nftAddress, uint256 tokenId, uint256 newPrice) external isOwner(nftAddress, tokenId, msg.sender) isListed(nftAddress, tokenId) {
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ItemListed(msg.sender, nftAddress, tokenId, newPrice);
    }

    /**
     * Nft 的 seller 将销售 nft 得到的钱提取到自己的钱包中
     */
    function withdrawProceeds() external payable {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) {
            revert NftMarketplace_NoProceeds();
        }
        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) {
            revert NftMarketplace_TransferFailed();
        }
    }

    function getListing(address nftAddress, uint256 tokenId) external view returns(Listing memory) {
        return s_listings[nftAddress][tokenId];
    }

    function getProceeds() external view returns(uint256) {
        return s_proceeds[msg.sender];
    }


    modifier isOwner(address nftAddress, uint256 tokenId, address seller) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (seller != owner) {
            revert NftMarketplace_NotOwner();
        }
        _;
    }
    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NftMarketplace_NotListed(nftAddress, tokenId);
        }
        _;
    }
}
